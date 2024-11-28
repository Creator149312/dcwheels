export function replaceDashWithUnderscore(str) {
    if (str.length === 0) return str;
    return str.replace(/-/g, "_");
  }