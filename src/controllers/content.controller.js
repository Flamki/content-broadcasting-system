const asyncHandler = require("../utils/async-handler");
const ApiError = require("../utils/api-error");
const contentService = require("../services/content.service");
const liveService = require("../services/live.service");

const uploadContent = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "File is required");
  }

  const payload = req.validated.body;
  const content = await contentService.createContent({
    title: payload.title,
    description: payload.description,
    subject: payload.subject,
    file: req.file,
    teacherId: req.user.id,
    startTime: payload.startTime,
    endTime: payload.endTime,
    rotationDurationMinutes: payload.rotationDurationMinutes
  });

  res.status(201).json({
    success: true,
    message: "Content uploaded and sent for approval",
    data: content
  });
});

const getMyContent = asyncHandler(async (req, res) => {
  const items = await contentService.listTeacherContents(req.user.id);
  res.status(200).json({
    success: true,
    data: items
  });
});

const getAllContent = asyncHandler(async (req, res) => {
  const result = await contentService.listAllContents(req.validated.query || {});
  res.status(200).json({
    success: true,
    data: result
  });
});

const getPendingContent = asyncHandler(async (_req, res) => {
  const items = await contentService.listPendingContents();
  res.status(200).json({
    success: true,
    data: items
  });
});

const approveContent = asyncHandler(async (req, res) => {
  const item = await contentService.approveContent(
    Number(req.validated.params.id),
    req.user.id
  );

  res.status(200).json({
    success: true,
    message: "Content approved",
    data: item
  });
});

const rejectContent = asyncHandler(async (req, res) => {
  const item = await contentService.rejectContent(
    Number(req.validated.params.id),
    req.user.id,
    req.validated.body.reason
  );

  res.status(200).json({
    success: true,
    message: "Content rejected",
    data: item
  });
});

const getLiveContent = asyncHandler(async (req, res) => {
  const result = await liveService.getLiveContentForTeacher({
    teacherKey: req.validated.params.teacherKey,
    subject: req.validated.query.subject
  });

  if (result.items.length === 0) {
    return res.status(200).json({
      success: true,
      message: "No content available",
      data: result
    });
  }

  return res.status(200).json({
    success: true,
    data: result
  });
});

module.exports = {
  uploadContent,
  getMyContent,
  getAllContent,
  getPendingContent,
  approveContent,
  rejectContent,
  getLiveContent
};
