const CLOUDINARY_CLOUD_NAME = "wkvsbkdy";
const CLOUDINARY_UPLOAD_PRESET = "aicivicfix_reports";

export async function uploadImageToCloudinary(file) {
    if (!file) {
        throw new Error("No image selected.");
    }

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    const fileName = file.name || "";
    const fileExt = fileName.slice(((fileName.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
    const allowedExtensions = ["jpg", "jpeg", "png", "webp"];

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExt)) {
        throw new Error("Please select a JPG, PNG, or WEBP image.");
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
        throw new Error("Image must be smaller than 5 MB.");
    }

    const formData = new FormData();

    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
            method: "POST",
            body: formData
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Cloudinary upload error:", errorText);
        throw new Error("Image upload failed. Please try again.");
    }

    const data = await response.json();

    return {
        imageUrl: data.secure_url,
        publicId: data.public_id || null,
        format: data.format || null,
        width: data.width || null,
        height: data.height || null
    };
}

if (typeof window !== "undefined") {
    window.uploadImageToCloudinary = uploadImageToCloudinary;
}