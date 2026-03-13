require("dotenv").config()
const { CountryState } = require("../models/country-city-model");
const logger = require("../middleware/logger");
const DashboardNotification = require("../models/notification-model");
const mongoose = require("mongoose")
const getStateIdFromCountry = async (country, getState) => {
    //distinct
    let allState = await CountryState.distinct("states", {
        "name": country
    });
    if (allState) {
        let getFipsCodeFromState = allState.find((list) => {
            if (list.name === getState) {
                return list;
            }
        });
        return getFipsCodeFromState;
    } else {
        return null;
    }
}

const setDashboardNotification = async (notifyMessage) => {
    const notify = new DashboardNotification({
        message: notifyMessage
    });
    let setValue = await notify.save();
    if (setValue) return true
    else return false;
};

const validateMobileNumber = async (mobile) => {
    let pattern = /^[0-9]{10}$/;
    return pattern.test(mobile);
}

const validatePassword = async (password) => {
    let passPattern = /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/
    return passPattern.test(password);
}

const validatePincode = async (pincode) => {
    let pinPattern = /^[0-9]{6}$/;
    return pinPattern.test(pincode);
}

const validateUserType = (userArr, userType) => {

    let findList = userArr.find((list) => {
        if (list.id === userType) {
            return list;
        }
    });

    let checkUserType = (findList !== undefined) ? true : false;

    if (checkUserType) {
        return {
            ...findList,
            status: true
        }
    } else {
        return {
            ...findList,
            status: false
        }
    }
}

const validateOtpValue = (inputOtp, existOtp) => {
    return (inputOtp !== existOtp) ? false : true;
};

const userTypeArr = [
    { id: 1, name: 'superadmin' },
    { id: 2, name: 'admin' },
    { id: 4, name: 'employee' },
    { id: 5, name: 'student' },
]

const getPaination = (req) => {

    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const skip = (page - 1) * limit;
    return { page, limit, skip }
}

const getFilter = (req, searchOptions,enableClientFilter=false) => {
    
    const client_status = req.query.client_status ?? 'all';
    const search = req.query.search ?? '';
    const replaceSpecialCharacter = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")

    const sortBy = req.query.sortBy ?? 'createdAt';
    const sortOrder = req.query.sortOrder ?? 'desc';

    const query = client_status === 'all' ? {} : { client_status: client_status };
    if(req?.user?.assigndClients && enableClientFilter){
        query["clientId"]={$in:req.user.assigndClients}
    }
    if (search) {
        query['$or'] = searchOptions.map(item => ({ [item]: { $regex: replaceSpecialCharacter, $options: 'i' } }))
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    return { sort, query }  
}

const getdemoFilter = (req, searchOptions) => {

    const status = req.query.status ?? 'all';
    const search = req.query.search ?? '';
    const sortBy = req.query.sortBy ?? 'createdAt';
    const sortOrder = req.query.sortOrder ?? 'desc';
    const query = status === 'all' ? {} : { status: status }; //{isMobileVerified:true}
    if (search) {
        query['$or'] = searchOptions.map(item => ({ [item]: { $regex: search, $options: 'i' } }))
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    return { sort, query }
}

const errorDetail = (error) => {
    message = error.message;
    const stackError = error.stack || '';
    const match = stackError.match(/at\s+.+\s+\((.+):(\d+):(\d+)\)/);
    const file = match ? match[1] : null;
    const line = match ? match[2] : null;
    const column = match ? match[3] : null;
    return { message, stackError, file, line, column }
}

const logError = (error) => {
    const { line, stack, message, file } = errorDetail(error)
    return logger.error({ line, stack, message, file });
}

const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const weekNumber = [0, 1, 2, 3, 4, 5, 6];

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

const passwordValidateRegEx = /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/
const pinValidateRegEx = /^[0-9]{6}$/
const mobileValidateRegEx = /^[0-9]{10}$/
const landLineValidateRegEx = /\d{2,5}([- ]*)\d{6}/
const aadharValidateRegEx = /^[0-9]{12}$/
const clientNameValidateRegEX = /^[a-zA-Z&-\s]+$/
const clientCodeValidateRegEX = /^[A-Za-z0-9]+$/
const urlValidateRegEx = /^www\.[a-zA-Z0-9-]+\.com$|^www\.[a-zA-Z0-9-]+\.in$|^www\.[a-zA-Z0-9-]+\.org$/

const monthResponse = [
    {
        name: 'January',
        monthNo: 1,
        value: 0
    },
    {
        name: 'Febuary',
        monthNo: 2,
        value: 0
    },
    {
        name: 'March',
        monthNo: 3,
        value: 0
    },
    {
        name: 'April',
        monthNo: 4,
        value: 0
    },
    {
        name: 'May',
        monthNo: 5,
        value: 0
    },
    {
        name: 'June',
        monthNo: 6,
        value: 0
    },
    {
        name: 'July',
        monthNo: 7,
        value: 0
    },
    {
        name: 'August',
        monthNo: 8,
        value: 0
    },
    {
        name: 'September',
        monthNo: 9,
        value: 0
    },
    {
        name: 'October',
        monthNo: 10,
        value: 0
    },
    {
        name: 'November',
        monthNo: 11,
        value: 0
    },
    {
        name: 'December',
        monthNo: 12,
        value: 0
    },

]


const batchFilter = (req) => {

    let matchQuery = {}

    const escapeRegex = (text) => {
        return text.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"); 
      };
    
    if(req.query.type==="offline"){
        matchQuery['batchMode']= "offline"
    }
    if(req.query.type==="online"){
        matchQuery['batchMode']= "online"
    }
    

    if(req.user?.email === "anshika@radiantinfonet.com" || req.user?.email === "anshuman@ficsi.in"){
        matchQuery["status"] = true
        matchQuery["clientId._id"]= mongoose.Types.ObjectId("65a79de3d0b713c333e514bc")
    }
    if(req.user?.email === "ncvet.testaonline@gmail.com" ){
        matchQuery["status"] = true
        matchQuery["clientId._id"]={$in:req.user.assigndClients}
    }
    else{ 
        if(req?.user?.assigndClients){
            matchQuery["clientId._id"]={$in:req.user.assigndClients}
        }
    }
    // Handling date range filtering
    const fromDate = req.query.from ? new Date(req.query.from) : null;
    const toDate = req.query.to ? new Date(req.query.to) : null;
    if (fromDate && toDate) {
        toDate.setHours(23, 59, 59, 999);
        matchQuery.createdAt = { $gte: fromDate, $lte: toDate };
    } else if (fromDate) {
        matchQuery.createdAt = { $gte: fromDate };
    } else if (toDate) {
        toDate.setHours(23, 59, 59, 999);
        matchQuery.createdAt = { $lte: toDate };
    }

    // Handling search
    const searchOptions = ['schemeId.schemeName', 'clientId.clientname', 'jobRole.jobRole', 'accessorId.fullName','subSchemeId.subSchemeName', 'batchId'];
    if (req.query.search) {
        const searchRegex = new RegExp(req.query.search, 'i');
        matchQuery['$or'] = searchOptions.map(item => ({ [item]: { $regex: searchRegex } }));
    }

    // Direct field in the Batch model
    if (req.query.batchId) {
        matchQuery.batchId = { $regex: new RegExp(req.query.batchId, 'i') };
    }

    // Fields in related models
    if (req.query.schemeName) {
        // matchQuery['schemeId.schemeName'] = { $regex: new RegExp(req.query.schemeName, 'i') };
        matchQuery['schemeId.schemeName'] = { $regex: new RegExp(`^${req.query.schemeName}$`, 'i')};
    }

    if (req.query.subSchemeName) {
        matchQuery['subSchemeId.subSchemeName'] = { $regex: new RegExp(req.query.subSchemeName, 'i') };
    }

    if (req.query.clientname) {
        matchQuery['clientId.clientname'] = { $regex: new RegExp(req.query.clientname, 'i') };
    }

    // if (req.query.jobRole) {
    //     matchQuery['jobRole.jobRole'] = { $regex: new RegExp(req.query.jobRole, 'i') };
    // }
    if (req.query.jobRole) {
        const safeJobRole = escapeRegex(req.query.jobRole); 
        matchQuery['jobRole.jobRole'] = { $regex: new RegExp(safeJobRole, 'i') };
    }

    return matchQuery;
};


const assignBatchatchFilter = (req) => {
  let matchQuery = {};

  matchQuery["status"] = true;
  
   if (req.user?.assigndClients) {
    matchQuery["clientId"] = { $in: req.user.assigndClients };
  }
  
  //Search filtering
  const searchOptions = [
    "schemeName",
    "clientname",
    "jobRoleNames",
    "batchId",
  ];

  if (req.query.search) {
    const searchRegex = new RegExp(`^${req.query.search.trim()}`, "i"); 
    matchQuery["$or"] = searchOptions.map((field) => ({
      [field]: { $regex: searchRegex },
    }));
  }
 
  return matchQuery;
};

const batchFilterV2 = (req) => {
  const {
    jobRole,
    schemeName,
    clientname,
    subSchemeName,
    batchId,
    search,
    type,
    status,
    from,
    to,
  } = req.query;

  const escapeRegex = (text) =>
    text.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");

  const matchQuery = {};

  // ✅ Type-based filters
  if (type === "offline") matchQuery.batchMode = "offline";
  if (type === "online") matchQuery.batchMode = "online";
  if (status) matchQuery.status = status === "true";

  // ✅ Date range
  if (from || to) {
    matchQuery.createdAt = {};
    if (from) matchQuery.createdAt.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      matchQuery.createdAt.$lte = toDate;
    }
  }

  // ✅ Client-based restriction
  if (req.user?.email === "anshika@radiantinfonet.com" || req.user?.email === "anshuman@ficsi.in") {
    matchQuery.status = true;
    matchQuery.clientId = mongoose.Types.ObjectId("65a79de3d0b713c333e514bc");
  } else if (req.user?.email === "ncvet.testaonline@gmail.com") {
    matchQuery.status = true;
    matchQuery.clientId = { $in: req.user.assigndClients };
  } else if (req?.user?.assigndClients) {
    matchQuery.clientId = { $in: req.user.assigndClients };
  }

  // ✅ Exact/partial match filters
  if (batchId)
    matchQuery.batchId = { $regex: new RegExp(escapeRegex(batchId), "i") };

  if (schemeName)
    matchQuery.schemeName = {
      $regex: new RegExp(`^${escapeRegex(schemeName)}$`, "i"),
    };

  if (subSchemeName)
    matchQuery.subSchemeName = {
      $regex: new RegExp(escapeRegex(subSchemeName), "i"),
    };

  if (clientname)
    matchQuery.clientname = {
      $regex: new RegExp(escapeRegex(clientname), "i"),
    };

  if (jobRole)
    matchQuery.jobRoleNames = {
      $regex: new RegExp(escapeRegex(jobRole), "i"),
    };

  // ✅ Search across multiple fields
  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), "i");
    matchQuery.$or = [
      { schemeName: { $regex: searchRegex } },
      { subSchemeName: { $regex: searchRegex } },
      { clientname: { $regex: searchRegex } },
      { jobRoleNames: { $regex: searchRegex } },
      { accessorName: { $regex: searchRegex } },
      { batchId: { $regex: searchRegex } },
    ];
  }

  return matchQuery;
};

module.exports = {
    batchFilterV2,
    aadharValidateRegEx,
    monthResponse,
    clientCodeValidateRegEX,
    clientNameValidateRegEX,
    passwordValidateRegEx,
    pinValidateRegEx,
    mobileValidateRegEx,
    validateMobileNumber,
    validatePassword,
    userTypeArr,
    validatePincode,
    validateUserType,
    getStateIdFromCountry,
    validateOtpValue,
    getPaination,
    getFilter,
    getdemoFilter,
    logError,
    weekDays,
    months,
    weeks,
    weekNumber,
    setDashboardNotification,
    batchFilter,
    landLineValidateRegEx,
    urlValidateRegEx,
    assignBatchatchFilter
}

