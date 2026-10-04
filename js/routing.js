// =========================================================
// AI CivicFix — Deterministic Municipal Routing Rules
// AI assists classification; configured municipal rules determine routing.
// =========================================================

window.Routing = {
  rules: {
    "Pothole": { department: "City Engineer / PWD", assignment: "Concerned Sub-City Engineer" },
    "Road Damage": { department: "City Engineer / PWD", assignment: "Concerned Sub-City Engineer" },
    "Footpath Damage": { department: "City Engineer / PWD", assignment: "Concerned Sub-City Engineer" },
    "Garbage": { department: "Health & Sanitation", assignment: "Sanitation Team" },
    "Waste Dumping": { department: "Health & Sanitation", assignment: "Sanitation Team" },
    "Waste Not Collected": { department: "Health & Sanitation", assignment: "Sanitation Team" },
    "Water Leakage": { department: "Water Supply & Drainage", assignment: "Water / Drainage Field Team" },
    "Drainage": { department: "Water Supply & Drainage", assignment: "Water / Drainage Field Team" },
    "Sewer Overflow": { department: "Water Supply & Drainage", assignment: "Water / Drainage Field Team" },
    "Sanitary Pipe Leakage": { department: "Water Supply & Drainage", assignment: "Water / Drainage Field Team" },
    "Broken Streetlight": { department: "Electricity", assignment: "Electrical Field Team" },
    "Streetlight Not Working": { department: "Electricity", assignment: "Electrical Field Team" },
    "High Mast Light": { department: "Electricity", assignment: "Electrical Field Team" },
    "Fallen Tree": { department: "Garden", assignment: "Garden Field Team" },
    "Tree Branch Problem": { department: "Garden", assignment: "Garden Field Team" },
    "Park Problem": { department: "Garden", assignment: "Garden Field Team" },
    "Road Encroachment": { department: "Encroachment", assignment: "Encroachment Field Team" },
    "Footpath Encroachment": { department: "Encroachment", assignment: "Encroachment Field Team" },
    "Public Space Obstruction": { department: "Encroachment", assignment: "Encroachment Field Team" }
  },

  resolve(problemType) {
    if (!problemType || problemType === "Other" || !this.rules[problemType]) {
      return {
        department: "Manual Department Review Required",
        assignment: "Manual Review Team",
        responsibleUnit: "Manual Department Review Required"
      };
    }
    const match = this.rules[problemType];
    return {
      department: match.department,
      assignment: match.assignment,
      responsibleUnit: match.assignment
    };
  },

  /**
   * Deterministic KMC Multi-Issue & Multi-Department Routing Engine
   * @param {Array<Object>} issueComponents - Array of detected components from Gemini analysis
   * @returns {Object} Normalized routing result
   */
  resolveMultiIssue(issueComponents) {
    if (!Array.isArray(issueComponents) || issueComponents.length === 0) {
      return {
        primaryIssue: null,
        secondaryIssues: [],
        primaryDepartment: "Manual Department Review Required",
        supportingDepartments: [],
        departmentCount: 0,
        requiresMultipleDepartments: false,
        departmentAssignments: [],
        workOrders: [],
        routingStatus: "MANUAL REVIEW REQUIRED",
        explanation: "AI could not confidently identify the civic issue. Please review the image and description."
      };
    }

    // Resolve deterministic department for each issue component
    const mapped = issueComponents.map(comp => {
      const type = comp.issueType || "Other";
      const route = this.resolve(type);
      return {
        ...comp,
        issueType: type,
        department: route.department,
        assignment: route.assignment
      };
    });

    const validMapped = mapped.filter(m => m.department !== "Manual Department Review Required");
    if (validMapped.length === 0) {
      return {
        primaryIssue: mapped[0],
        secondaryIssues: mapped.slice(1),
        primaryDepartment: "Manual Department Review Required",
        supportingDepartments: [],
        departmentCount: 0,
        requiresMultipleDepartments: false,
        departmentAssignments: mapped.map(m => ({
          issueType: m.issueType,
          role: m.role || "primary",
          department: "Manual Department Review Required"
        })),
        workOrders: [],
        routingStatus: "MANUAL REVIEW REQUIRED",
        explanation: "AI could not confidently identify the civic issue. Please review the image and description."
      };
    }

    // Primary Department Logic:
    // Preferred rule:
    // If an issue is identified as possible_root_cause and another issue is secondary_impact,
    // then the department responsible for the possible root cause becomes the primary department.
    let primaryIssue = null;
    const rootCause = mapped.find(c => c.role === "possible_root_cause" && c.department !== "Manual Department Review Required");
    const secondaryImpact = mapped.find(c => c.role === "secondary_impact" && c.department !== "Manual Department Review Required");

    if (rootCause && secondaryImpact) {
      primaryIssue = rootCause;
    } else {
      // If no root-cause relationship exists, look for explicit primary_issue
      const explicitPrimary = mapped.find(c => c.role === "primary_issue" && c.department !== "Manual Department Review Required");
      if (explicitPrimary) {
        primaryIssue = explicitPrimary;
      } else {
        // Fallback to highest confidence
        primaryIssue = [...validMapped].sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0] || mapped[0];
      }
    }

    const primaryDepartment = primaryIssue.department || "City Engineer / PWD";
    const secondaryIssues = mapped.filter(c => c !== primaryIssue);

    // Multi-Department Result:
    // DepartmentCount must be calculated from the UNIQUE departments.
    const allUniqueDepts = [];
    mapped.forEach(c => {
      if (c.department && c.department !== "Manual Department Review Required" && !allUniqueDepts.includes(c.department)) {
        allUniqueDepts.push(c.department);
      }
    });

    const departmentCount = allUniqueDepts.length || 1;
    const supportingDepartments = allUniqueDepts.filter(d => d !== primaryDepartment);
    const requiresMultipleDepartments = departmentCount > 1;

    // Create normalized department assignments
    const departmentAssignments = mapped.map(c => {
      const isPrimary = (c === primaryIssue);
      let assignedRole = isPrimary ? "primary" : (c.role === "secondary_impact" ? "supporting" : "secondary");
      return {
        issueType: c.issueType,
        role: assignedRole,
        department: c.department,
        originalRole: c.role,
        severity: c.severity,
        recommendedAction: c.recommendedAction,
        evidence: c.evidence
      };
    });

    // Work Order Relationship:
    // Represent department work as linked work orders/tasks with dependency
    const workOrders = [];
    if (primaryDepartment !== "Manual Department Review Required") {
      workOrders.push({
        id: "WO-A",
        department: primaryDepartment,
        task: primaryIssue.recommendedAction || `Inspect and repair ${primaryIssue.issueType.toLowerCase()}`,
        role: "primary",
        status: "PENDING_DISPATCH",
        dependsOn: null
      });

      supportingDepartments.forEach((suppDept, idx) => {
        const matchingComp = secondaryIssues.find(s => s.department === suppDept) || secondaryIssues[0];
        const task = matchingComp?.recommendedAction || `Repair/address secondary ${matchingComp?.issueType || suppDept} impact`;
        workOrders.push({
          id: `WO-${String.fromCharCode(66 + idx)}`,
          department: suppDept,
          task: task,
          role: "supporting",
          status: "WAITING_DEPENDENCY",
          dependsOn: "WO-A",
          dependencyReason: `Road restoration/surface repair depends on resolution of ${primaryIssue.issueType.toLowerCase()} by ${primaryDepartment}`
        });
      });
    }

    // Concise citizen explanation
    let explanation;
    if (requiresMultipleDepartments) {
      explanation = "The image appears to show multiple related civic issues. CivicFix can route the suspected underlying infrastructure issue and the resulting road damage to the relevant municipal teams.";
    } else if (departmentCount === 1) {
      explanation = `AI identified a ${primaryIssue.issueType.toLowerCase()} civic issue. Configured municipal rules route this directly to ${primaryDepartment}.`;
    } else {
      explanation = "AI could not confidently identify the civic issue. Please review the image and description.";
    }

    return {
      primaryIssue,
      secondaryIssues,
      primaryDepartment,
      supportingDepartments,
      departmentCount,
      requiresMultipleDepartments,
      departmentAssignments,
      workOrders,
      routingStatus: primaryDepartment === "Manual Department Review Required" ? "MANUAL REVIEW REQUIRED" : "CONFIRMED",
      explanation
    };
  },

  getResolutionChain(problemType = "Pothole", ward = "20") {
    const route = this.resolve(problemType);
    return [
      "GPS",
      "Kolhapur",
      "KMC Jurisdiction",
      `Ward ${ward}`,
      problemType,
      "Municipal Rule",
      route.department,
      route.assignment
    ];
  },

  getRoutingExplanation(problemType = "Pothole", ward = "20") {
    const route = this.resolve(problemType);
    return `AI identified a ${problemType.toLowerCase()} civic issue. Location falls inside Kolhapur Municipal Corporation (KMC). Ward ${ward} service boundary was resolved. Configured municipal rules route this directly to ${route.department} (Assignment: ${route.assignment}).`;
  }
};
