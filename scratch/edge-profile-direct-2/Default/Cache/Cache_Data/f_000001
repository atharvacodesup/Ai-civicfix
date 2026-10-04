/**
 * AI CivicFix - Reusable Firebase AI Logic Module
 * Connects Firebase App -> Firebase AI Logic -> GoogleAIBackend -> Gemini Model
 */

import { getAI, getGenerativeModel, GoogleAIBackend } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-ai.js";
import { app } from "./firebase-init.js";

// Configurable model constant (current Gemini model supported by Firebase AI Logic)
export const GEMINI_MODEL = "gemini-3.5-flash-lite";

let aiInstance = null;
let generativeModelInstance = null;
let isAnalysisInFlight = false;

/**
 * Initializes and returns the Firebase AI instance using GoogleAIBackend
 */
export function getAIService() {
    if (!aiInstance) {
        if (!app) {
            throw new Error("Firebase App is not initialized. Ensure firebase-init.js is loaded.");
        }
        aiInstance = getAI(app, {
            backend: new GoogleAIBackend()
        });
    }
    return aiInstance;
}

/**
 * Returns a generative model configured with the project's AI backend
 * @param {string} [modelName=GEMINI_MODEL] 
 */
export function getCivicFixModel(modelName = GEMINI_MODEL) {
    if (!generativeModelInstance || generativeModelInstance.model !== modelName) {
        const ai = getAIService();
        generativeModelInstance = getGenerativeModel(ai, {
            model: modelName
        });
    }
    return generativeModelInstance;
}

/**
 * Formats error objects into clean, developer-friendly messages without exposing API keys or secrets
 * @param {Error|any} error 
 * @returns {string}
 */
export function formatAIError(error) {
    if (!error) return "Unknown AI error occurred.";
    const message = error.message || String(error);

    if (message.includes("quota") || message.includes("RESOURCE_EXHAUSTED") || message.includes("429") || message.includes("rate limit") || message.includes("Rate limit")) {
        return "AI analysis rate limit reached. Please wait a moment and try again.";
    }
    if (message.includes("app-check") || message.includes("AppCheck") || message.includes("403") || message.includes("PERMISSION_DENIED")) {
        return `Firebase AI / App Check Permission Error: ${message}. If App Check enforcement is active, register the local debug token from browser console into Firebase Console > App Check > Apps.`;
    }
    if (message.includes("404") || message.includes("not found") || message.includes("is not supported")) {
        return `Gemini Model Error: Model "${GEMINI_MODEL}" may not be supported or enabled for this project. ${message}`;
    }
    if (message.includes("Failed to fetch") || message.includes("NetworkError") || message.includes("network")) {
        return `Network Connection Error: Could not reach Firebase AI / Gemini endpoints. Check network or CORS settings. ${message}`;
    }
    return message;
}

/**
 * Basic connection test sending a simple greeting to verify end-to-end integration.
 * @returns {Promise<string>} Gemini model response text
 */
export async function testGeminiConnection() {
    try {
        const model = getCivicFixModel(GEMINI_MODEL);
        const prompt = "Reply exactly: AI CivicFix Gemini connection successful.";

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        return text ? text.trim() : "";
    } catch (error) {
        console.error("AI CivicFix Gemini connection error:", error);
        throw new Error(formatAIError(error));
    }
}

/**
 * Supported civic issue categories for Kolhapur Municipal Corporation
 */
export const CIVIC_CATEGORIES = [
    "Pothole",
    "Road Damage",
    "Footpath Damage",
    "Garbage",
    "Waste Dumping",
    "Waste Not Collected",
    "Water Leakage",
    "Drainage",
    "Sewer Overflow",
    "Sanitary Pipe Leakage",
    "Broken Streetlight",
    "Streetlight Not Working",
    "High Mast Light",
    "Fallen Tree",
    "Tree Branch Problem",
    "Park Problem",
    "Road Encroachment",
    "Footpath Encroachment",
    "Public Space Obstruction",
    "Other"
];

/**
 * Normalizes synonymous AI results into the canonical CivicFix issue taxonomy
 * @param {string} rawType
 * @returns {string}
 */
export function normalizeIssueType(rawType) {
    if (!rawType || typeof rawType !== "string") return "Other";
    const clean = rawType.trim();
    // Direct exact case-insensitive match
    const exact = CIVIC_CATEGORIES.find(c => c.toLowerCase() === clean.toLowerCase());
    if (exact) return exact;

    const lower = clean.toLowerCase();

    // Sanitary Pipe Leakage vs Sewer Overflow vs Drainage vs Water Leakage
    if (lower.includes("sanitary") || lower.includes("sewage pipe") || lower.includes("sewer pipe") || lower.includes("drain pipe") || lower.includes("pipe leak")) {
        return "Sanitary Pipe Leakage";
    }
    if (lower.includes("sewer overflow") || lower.includes("sewage overflow") || lower.includes("manhole overflow") || lower.includes("sewage spill")) {
        return "Sewer Overflow";
    }
    if (lower.includes("drain") || lower.includes("gutter") || lower.includes("stormwater") || lower.includes("clogged drain")) {
        return "Drainage";
    }
    if (lower.includes("water leak") || lower.includes("pipeline") || lower.includes("water burst") || lower.includes("main burst")) {
        return "Water Leakage";
    }

    // Road / Pothole / Footpath
    if (lower.includes("pothole")) return "Pothole";
    if (lower.includes("footpath") || lower.includes("sidewalk") || lower.includes("pedestrian") || lower.includes("pavement")) {
        return "Footpath Damage";
    }
    if (lower.includes("road") || lower.includes("asphalt") || lower.includes("tarmac") || lower.includes("street damage") || lower.includes("crater")) {
        return "Road Damage";
    }

    // Waste / Garbage
    if (lower.includes("dump") || lower.includes("debris") || lower.includes("illegal dumping")) {
        return "Waste Dumping";
    }
    if (lower.includes("not collected") || lower.includes("uncollected") || lower.includes("overflowing bin") || lower.includes("overflowing dustbin")) {
        return "Waste Not Collected";
    }
    if (lower.includes("garbage") || lower.includes("trash") || lower.includes("waste") || lower.includes("litter")) {
        return "Garbage";
    }

    // Streetlight / Electricity
    if (lower.includes("high mast") || lower.includes("floodlight")) {
        return "High Mast Light";
    }
    if (lower.includes("broken streetlight") || lower.includes("broken light") || lower.includes("damaged pole") || lower.includes("damaged light")) {
        return "Broken Streetlight";
    }
    if (lower.includes("streetlight") || lower.includes("street light") || lower.includes("lamp") || lower.includes("dark street")) {
        return "Streetlight Not Working";
    }

    // Trees / Parks
    if (lower.includes("branch") || lower.includes("limb")) {
        return "Tree Branch Problem";
    }
    if (lower.includes("fallen tree") || lower.includes("tree fell") || lower.includes("uprooted tree") || lower.includes("tree")) {
        return "Fallen Tree";
    }
    if (lower.includes("park") || lower.includes("garden") || lower.includes("playground") || lower.includes("bench")) {
        return "Park Problem";
    }

    // Encroachment
    if (lower.includes("footpath encroachment") || lower.includes("sidewalk encroachment")) {
        return "Footpath Encroachment";
    }
    if (lower.includes("road encroachment")) {
        return "Road Encroachment";
    }
    if (lower.includes("encroach") || lower.includes("obstruction") || lower.includes("hawker") || lower.includes("stall") || lower.includes("illegal structure")) {
        return "Public Space Obstruction";
    }

    return "Other";
}

/**
 * Structured output schema for Firebase AI Logic Gemini multi-issue civic analysis
 */
export const civicAnalysisSchema = {
    type: "OBJECT",
    properties: {
        issueComponents: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    issueType: {
                        type: "STRING",
                        enum: CIVIC_CATEGORIES,
                        description: "The civic issue type from the allowed CivicFix taxonomy."
                    },
                    role: {
                        type: "STRING",
                        enum: ["primary_issue", "possible_root_cause", "secondary_impact", "co_occurring_issue"],
                        description: "Visual role or relationship: possible_root_cause, secondary_impact, primary_issue, or co_occurring_issue."
                    },
                    severity: {
                        type: "STRING",
                        enum: ["Low", "Medium", "High"],
                        description: "Estimated severity based strictly on visible evidence."
                    },
                    confidence: {
                        type: "NUMBER",
                        description: "Confidence percentage (e.g. 86 or 0.86) based on clarity and visibility."
                    },
                    summary: {
                        type: "STRING",
                        description: "Brief summary describing this specific civic issue component."
                    },
                    evidence: {
                        type: "ARRAY",
                        items: {
                            type: "STRING"
                        },
                        description: "List of specific visual observations supporting this issue."
                    },
                    recommendedAction: {
                        type: "STRING",
                        description: "Recommended municipal action for this component."
                    }
                },
                required: ["issueType", "role", "severity", "confidence", "summary", "evidence", "recommendedAction"]
            },
            description: "List of all clearly visible civic issue components relevant to municipal action."
        },
        overallSeverity: {
            type: "STRING",
            enum: ["Low", "Medium", "High"],
            description: "Combined overall severity across all detected issue components."
        },
        requiresMultipleDepartments: {
            type: "BOOLEAN",
            description: "Whether resolving all detected issues may require coordination across multiple municipal departments."
        },
        analysisSummary: {
            type: "STRING",
            description: "Concise summary of the civic situation observed in the photo."
        }
    },
    required: ["issueComponents", "overallSeverity", "requiresMultipleDepartments", "analysisSummary"]
};

/**
 * Converts a browser File, Blob, Data URL string, or HTTP URL into the inlineData format expected by Firebase AI Logic
 * @param {File|Blob|string} input 
 * @returns {Promise<{inlineData: {data: string, mimeType: string}}>}
 */
export async function toGenerativeImagePart(input) {
    if (!input) {
        throw new Error("No photo provided for civic image analysis.");
    }

    // 1. Browser File or Blob
    if (input instanceof Blob || (typeof File !== "undefined" && input instanceof File)) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result;
                const matches = typeof result === "string" && result.match(/^data:([^;]+);base64,(.+)$/);
                if (matches) {
                    resolve({
                        inlineData: {
                            mimeType: input.type || matches[1] || "image/jpeg",
                            data: matches[2]
                        }
                    });
                } else {
                    reject(new Error("Failed to encode image to base64 format."));
                }
            };
            reader.onerror = () => reject(new Error("Failed to read image file."));
            reader.readAsDataURL(input);
        });
    }

    // 2. Data URL string ("data:image/...;base64,...")
    if (typeof input === "string" && input.startsWith("data:")) {
        const matches = input.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
            return {
                inlineData: {
                    mimeType: matches[1] || "image/jpeg",
                    data: matches[2]
                }
            };
        }
    }

    // 3. Remote HTTP / HTTPS URL (e.g., Cloudinary) or relative path
    if (typeof input === "string" && (input.startsWith("http://") || input.startsWith("https://") || input.startsWith("/") || input.startsWith("../"))) {
        const res = await fetch(input);
        if (!res.ok) {
            throw new Error(`Could not fetch image for analysis (${res.status})`);
        }
        const blob = await res.blob();
        return toGenerativeImagePart(blob);
    }

    throw new Error("Unsupported image input format. Expected a File, Blob, or image URL.");
}

/**
 * Analyzes a civic problem image using multimodal Gemini and returns structured multi-issue JSON
 * @param {File|Blob|string} file - The citizen's uploaded image file or URL
 * @param {string} [citizenDescription=""] - Optional context provided by the citizen
 * @returns {Promise<{issueComponents: Array, overallSeverity: string, requiresMultipleDepartments: boolean, analysisSummary: string, category: string, severity: string, confidence: number, summary: string, observations: string[], recommendedAction: string}>}
 */
export async function analyzeCivicImage(file, citizenDescription = "") {
    if (isAnalysisInFlight) {
        throw new Error("An AI analysis request is already running. Please wait for it to complete.");
    }
    isAnalysisInFlight = true;
    try {
        const ai = getAIService();
        const model = getGenerativeModel(ai, {
            model: GEMINI_MODEL,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: civicAnalysisSchema
            }
        });

        const imagePart = await toGenerativeImagePart(file);

        const promptText = `You are the visual analysis engine for AI CivicFix, a civic issue reporting system for Kolhapur Municipal Corporation.

Analyze the provided civic-problem image together with the citizen description.

Your job is to identify ALL clearly visible civic issue components that are relevant to municipal action.

Do not force the image into a single category.

One image may contain:
- one issue
- multiple simultaneous issues
- a possible root cause and a secondary impact
- multiple infrastructure problems

For every detected issue component:
- identify the issue type from the allowed categories: Pothole, Road Damage, Footpath Damage, Garbage, Waste Dumping, Waste Not Collected, Water Leakage, Drainage, Sewer Overflow, Sanitary Pipe Leakage, Broken Streetlight, Streetlight Not Working, High Mast Light, Fallen Tree, Tree Branch Problem, Park Problem, Road Encroachment, Footpath Encroachment, Public Space Obstruction, Other
- estimate severity from visible evidence (Low, Medium, or High)
- provide confidence (between 0.0 and 1.0 or 0 and 100)
- list visual evidence observations
- identify whether it appears to be a possible root cause (possible_root_cause), primary issue (primary_issue), secondary impact (secondary_impact), or independent co-occurring issue (co_occurring_issue)

IMPORTANT CAUSALITY RULE:
A photograph alone may not prove causality.
DO NOT state with certainty that one issue caused another (e.g. do NOT say "pipe leakage caused the pothole").
Instead, use cautious language such as:
'possible root cause'
'possible secondary impact'
'possible pipe leakage associated with visible road damage'
when causality cannot be established visually.
Distinguish VISIBLE FACT from POSSIBLE RELATIONSHIP.

Do not invent:
- ward
- division
- address
- department
- officer
- road name
- underground infrastructure facts
- information not visible in the image

Do not assign a final municipal department.
The application will determine department responsibility using KMC routing rules.

Severity guidance:
LOW:
Minor issue with limited visible impact.
MEDIUM:
Clearly noticeable issue that may affect usability, safety, sanitation, infrastructure, or public access.
HIGH:
Serious visible damage, significant obstruction, major sanitation concern, dangerous infrastructure condition, or issue that appears to require prompt municipal attention.

${citizenDescription ? `Citizen's description:\n"${citizenDescription}"\n` : "Citizen description: None provided.\n"}

Return structured JSON only matching the schema.`;

        const result = await model.generateContent([
            promptText,
            imagePart
        ]);

        const response = await result.response;
        const text = response.text();

        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (parseErr) {
            const cleaned = text.replace(/```json\s*|```/g, "").trim();
            parsed = JSON.parse(cleaned);
        }

        let rawComponents = Array.isArray(parsed?.issueComponents) ? parsed.issueComponents : [];

        // Backward-compatibility: If Gemini returned a single category or legacy format
        if (rawComponents.length === 0 && (parsed?.category || parsed?.issueType)) {
            const singleCat = parsed.category || parsed.issueType;
            rawComponents = [{
                issueType: singleCat,
                role: "primary_issue",
                severity: parsed.severity || "Medium",
                confidence: parsed.confidence ?? 90,
                summary: parsed.summary || parsed.analysisSummary || `${singleCat} detected.`,
                evidence: Array.isArray(parsed.observations) ? parsed.observations : (parsed.evidence ? [String(parsed.evidence)] : ["Visual evidence in photo"]),
                recommendedAction: parsed.recommendedAction || "Municipal inspection and repair"
            }];
        }

        // Normalize each issue component
        const normalizedComponents = rawComponents.map((comp, idx) => {
            const normType = normalizeIssueType(comp.issueType);
            let role = comp.role || (idx === 0 ? "primary_issue" : "secondary_impact");
            const validRoles = ["primary_issue", "possible_root_cause", "secondary_impact", "co_occurring_issue"];
            if (!validRoles.includes(role)) {
                const rLower = String(role).toLowerCase();
                if (rLower.includes("cause") || rLower.includes("root")) role = "possible_root_cause";
                else if (rLower.includes("impact") || rLower.includes("secondary")) role = "secondary_impact";
                else if (rLower.includes("primary")) role = "primary_issue";
                else role = "co_occurring_issue";
            }

            let sev = comp.severity || "Medium";
            if (!["Low", "Medium", "High"].includes(sev)) {
                const sLower = String(sev).toLowerCase();
                if (sLower.includes("high") || sLower.includes("crit") || sLower.includes("urg")) sev = "High";
                else if (sLower.includes("low") || sLower.includes("min")) sev = "Low";
                else sev = "Medium";
            }

            let conf = comp.confidence;
            if (typeof conf === "number") {
                if (conf <= 1.0) conf = Math.round(conf * 100);
                else conf = Math.round(conf);
            } else {
                conf = 88;
            }

            let evidence = Array.isArray(comp.evidence) ? comp.evidence : (comp.evidence ? [String(comp.evidence)] : []);
            if (evidence.length === 0 && Array.isArray(comp.observations)) {
                evidence = comp.observations;
            }
            if (evidence.length === 0) {
                evidence = [`Visual evidence of ${normType.toLowerCase()} observed in photo`];
            }

            return {
                issueType: normType,
                role: role,
                severity: sev,
                confidence: conf,
                summary: comp.summary || `${normType} identified from photo evidence.`,
                evidence: evidence,
                recommendedAction: comp.recommendedAction || "Municipal inspection and repair"
            };
        });

        // Determine primary issue component using relationship priority (root cause > primary issue > highest confidence)
        const primaryComponent = normalizedComponents.find(c => c.role === "possible_root_cause")
            || normalizedComponents.find(c => c.role === "primary_issue")
            || [...normalizedComponents].sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0]
            || {
                issueType: "Other",
                role: "primary_issue",
                severity: "Medium",
                confidence: 50,
                summary: "Could not identify civic issue.",
                evidence: ["No conclusive visual evidence detected."],
                recommendedAction: "Manual review required"
            };

        // Determine overall severity
        let overallSeverity = parsed.overallSeverity;
        if (!["Low", "Medium", "High"].includes(overallSeverity)) {
            if (normalizedComponents.some(c => c.severity === "High")) overallSeverity = "High";
            else if (normalizedComponents.some(c => c.severity === "Medium")) overallSeverity = "Medium";
            else overallSeverity = primaryComponent.severity || "Low";
        }

        const requiresMultipleDepartments = typeof parsed.requiresMultipleDepartments === "boolean"
            ? parsed.requiresMultipleDepartments
            : (normalizedComponents.length > 1);

        const analysisSummary = parsed.analysisSummary || primaryComponent.summary || "AI visual analysis completed.";

        return {
            issueComponents: normalizedComponents,
            overallSeverity: overallSeverity,
            requiresMultipleDepartments: requiresMultipleDepartments,
            analysisSummary: analysisSummary,

            // Backward compatibility fields for single-issue consumers
            category: primaryComponent.issueType,
            problemType: primaryComponent.issueType,
            severity: overallSeverity,
            confidence: primaryComponent.confidence,
            summary: analysisSummary,
            observations: primaryComponent.evidence || [],
            recommendedAction: primaryComponent.recommendedAction
        };
    } catch (error) {
        console.error("AI CivicFix Image Analysis Error:", error);
        throw new Error(formatAIError(error));
    } finally {
        isAnalysisInFlight = false;
    }
}

