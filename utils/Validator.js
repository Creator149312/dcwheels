export const validateEmail = (email) => {
  let err = "";
  // Validate email address
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.trim()) {
    err = "Email address is required";
  } else if (!emailRegex.test(email)) {
    err = "Invalid email address";
  }

  return err.length === 0 ? "" : err;
};

export const validatePassword = (password) => {
  let err = "";
  if (!/[a-z]/.test(password))
    err = "Password must contain at least one lowercase letter (a to z)";
  if (!/[A-Z]/.test(password))
    err = "Password must contain at least one uppercase letter (A to Z)";
  if (!/\d/.test(password))
    err = "Password must contain at least one digit (0 to 9)";

  let epl = validatePasswordLength(password);
  if (epl.length !== 0) err = epl;

  return err.length === 0 ? "" : err;
};

export const validatePasswordLength = (password) => {
  let err = "";
  if (password.length < 8) err = "Password must be at least 8 characters long";
  if (password.length > 128)
    err = "Password must be at atmost 128 characters long";

  return err.length === 0 ? "" : err;
};

export const validateUsername = (username) => {
  let err = "";
  // Username handle pattern: 3-40 chars, alphanumeric + dots/underscores/hyphens
  // BUT cannot start/end with special chars (., _, -)
  if (!username.trim()) {
    err = "Username is required";
  } else if (username.length < 3) {
    err = "Username must be at least 3 characters";
  } else if (username.length > 40) {
    err = "Username must be at most 40 characters";
  } else if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/.test(username)) {
    err = "Username must start and end with a letter or number, and can contain dots, underscores, or hyphens in the middle.";
  }

  return err.length === 0 ? "" : err;
};

export const validateListTitle = (input) => {
  let err = "";

  const inputRegex = /[^a-zA-Z0-9\s-]/;

  if (!input.trim()) {
    err = "Wheel name is required!";
  } else if (inputRegex.test(input)) {
    err = "Invalid name, please remove invalid characters!";
  }

  if (input.length < 4) err = "Wheel title must be at least 4 characters long";
  if (input.length > 256) err = "Wheel title be of atmost 256 characters long";

  return err.length === 0 ? "" : err;
};

export const validateListDescription = (input) => {
  let err = "";

  // Regex pattern for characters that could be problematic for SQL or MongoDB injection
  const dangerousCharacters = /['"<>;=\\]/g; // Add more characters as necessary for specific databases

  // Trim leading/trailing whitespace
  const sanitizedInput = input.trim();

  // Check if description is empty
  if (!sanitizedInput) {
    err = "Description is required!";
  }
  // Check if dangerous characters are present
  else if (dangerousCharacters.test(sanitizedInput)) {
    err =
      "Invalid description, please remove potentially dangerous characters!";
  }
  // Length validation
  else if (sanitizedInput.length < 8) {
    err = "Description must be at least 8 characters long.";
  } else if (sanitizedInput.length > 512) {
    err = "Description must be at most 512 characters long.";
  }

  // If no error, return empty string, otherwise the error message
  return err.length === 0 ? "" : err;
};

export const sanitizeInputForDB = (input) => {
  // Remove potentially dangerous characters
  const dangerousCharacters = /['"<>;=\\]/g;
  return input.replace(dangerousCharacters, '');
};

export const validateObjectID = (id) => {
  // Basic validation for MongoDB ObjectId
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
};

export const validateQuizSegments = (segments) => {
  if (!Array.isArray(segments) || segments.length === 0) {
    return "Quiz wheel must have at least one question segment.";
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (!seg || typeof seg !== "object") {
      return `Question ${i + 1}: Invalid question segment object.`;
    }

    const questionText = typeof seg.question === "string" ? seg.question.trim() : "";
    if (!questionText) {
      return `Question ${i + 1}: Question text is required.`;
    }

    const options = Array.isArray(seg.options) ? seg.options : [];
    const filledOptions = options.filter(
      (o) => typeof o === "string" && o.trim().length > 0
    );

    if (filledOptions.length < 2) {
      return `Question ${i + 1}: At least 2 answer options are required.`;
    }

    if (
      typeof seg.correctIndex !== "number" ||
      !Number.isInteger(seg.correctIndex) ||
      seg.correctIndex < 0 ||
      seg.correctIndex >= options.length
    ) {
      return `Question ${i + 1}: Correct answer selection is invalid.`;
    }
  }

  return "";
};

export const validateWheel = ({ title, description, wheelType, segData }) => {
  if (!title || typeof title !== "string" || !title.trim()) {
    return "Wheel title is required!";
  }
  if (!description || typeof description !== "string" || !description.trim()) {
    return "Wheel description is required!";
  }
  if (!Array.isArray(segData) || segData.length === 0) {
    return "Wheel data is required and must contain at least 1 option.";
  }

  const titleErr = validateListTitle(title);
  if (titleErr) return titleErr;

  const descErr = validateListDescription(description);
  if (descErr) return descErr;

  if (wheelType === "quiz") {
    const quizErr = validateQuizSegments(segData);
    if (quizErr) return quizErr;
  }

  return "";
};
