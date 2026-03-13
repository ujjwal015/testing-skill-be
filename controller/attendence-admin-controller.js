const Joi = require("@hapi/joi");
const moment = require("moment");
const { Paginate } = require("../utils/paginate");
const { sendResponse, errorResponse } = require("../utils/response");
const { getFilter } = require("../utils/custom-validators");
const responseMessage = require("../utils/responseMessage");
const AttendenceAdminModel = require("../models/attendence-admin-model");

module.exports.clockIn = async (req, res) => {
  try {
    const { error } = validateClockIn(req.body);
    if (error)
      return errorResponse(res, 400, responseMessage.something_wrong, error.message);
    const {
      clock_in_time,
      clock_out_time,
      startTime,
      endTime,
      idle_time,
      effective_time,
      is_clock_in,
      is_clock_out,
      user_id,
      attendence_date,
    } = req.body;
    existAttendence = await AttendenceAdminModel.findOne({
      user_id,
      attendence_date: attendence_date,
    });
    if (is_clock_in && existAttendence) {
      if (startTime!=' ') {
        existAttendence.attendence_log.push({
          startTime: startTime,
          endTime: "",
        });
      } else {
        let index = existAttendence.attendence_log.findIndex(
          (item) => item.endTime == ""
        );
        existAttendence.attendence_log[index].endTime = endTime;
      }
    }
    if (existAttendence) {
      existAttendence.clock_out_time = clock_out_time;
      existAttendence.is_clock_in = false;
      existAttendence.idle_time = idle_time;
      existAttendence.is_clock_out = true;
      existAttendence.effective_time = effective_time;
      const updateAttendence = await existAttendence.save();
      if (updateAttendence) {
        return sendResponse(
          res,
          200,
          "Attendence update successfully",
          "Attendence update successfully"
        );
      } else {
        return errorResponse(
          res,
          400,
          responseMessage.something_wrong,
          responseMessage.something_wrong
        );
      }
    } else {
      let attendanceDetails = await new AttendenceAdminModel({
        clock_in_time,
        clock_out_time,
        idle_time,
        effective_time,
        is_clock_in,
        is_clock_out,
        user_id,
        attendence_date,
      }).save();

      if (!attendanceDetails)
        return errorResponse(
          res,
          400,
          responseMessage.something_wrong,
          responseMessage.something_wrong
        );
      if (attendanceDetails)
        return sendResponse(
          res,
          200,
          "Attendence Save successfully",
          "Attendence Save successfully"
        );
    }
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, responseMessage.something_wrong, error);
  }
};

const validateClockIn = (data) => {
  try {
    const schema = Joi.object({
      clock_in_time: Joi.string().required(),
      user_id: Joi.string().required(),
      is_clock_in: Joi.bool().required(),
      idle_time: Joi.number().required(),
      effective_time: Joi.number().required(),
      is_clock_out: Joi.bool().required(),
      startTime:Joi.string(),
      endTime:Joi.string(),
      clock_out_time: Joi.string().when("is_clock_out", {
        is: true,
        then: Joi.string().required(),
        otherwise: Joi.string(),
      }),
      attendence_date: Joi.date().required(),
    });

    return schema.validate(data);
  } catch (err) {
    console.log(err);
  }
};
