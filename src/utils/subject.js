function normalizeSubject(subject) {
  if (!subject || typeof subject !== "string") {
    return "";
  }

  return subject.trim().toLowerCase();
}

module.exports = {
  normalizeSubject
};
