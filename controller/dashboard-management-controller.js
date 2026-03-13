const { sendResponse, errorResponse } = require("../utils/response")
const responseMessage = require("../utils/responseMessage");
const Component = require("../models/componentModel");
const Dashboard = require("../models/dashboardModel");
const UserDashboard = require("../models/userDashboardModel")
const Uuser = require("../models/user-model")

const Joi = require("joi");
const { Paginate } = require("../utils/paginate");
const { getFilter } = require("../utils/custom-validators");

// components handling controller

module.exports.addComponent = async (req, res) => {
    try {
        const { component_name, component_type, component_category, default_layout, endpoint=null } = req.body;

        // Validate request body with Joi
        const { error } = componentValidationSchema.validate(req.body);

        if (error) {
            // Collect all validation error messages
            const validationErrors = error.details.map((err) => err.message);
            return errorResponse(res, 400, "Validation Error", validationErrors);
        }

        //existing component check
        const existingComponent = await Component.findOne({component_name:component_name,component_type:component_type })
        if(existingComponent){
            return errorResponse(res, 400, "Component already available with this name", "Component already available with this name");
        }

        const newComponent = await Component.create({
            component_name,
            component_type,
            component_category,
            default_layout,
            endpoint,
            created_by:null,
        });

        return sendResponse(res, 201, responseMessage.success, newComponent);
    } catch (error) {
        return errorResponse(res, 500, responseMessage.something_wrong, error.message);
    }
};

module.exports.getAllComponents = async (req, res) => {
    try {
        const components = await Component.find({})

        const response = components.reduce((acc, item)=> { 
               if(!acc[item.component_type]){
                    acc[item.component_type] = {}
               }
                // acc[item.component_type].push(item)


                if(!acc[item.component_type][item.component_category]){
                    acc[item.component_type][item.component_category] = []
                }
                acc[item.component_type][item.component_category].push(item)


            return acc
               
        }, {})

        return sendResponse(res, 200, responseMessage.success, response );
    } catch (error) {
        return errorResponse(res, 500, responseMessage.something_wrong, error.message);
    }
};

module.exports.getComponentById = async (req, res) => {
    try {
        const { id } = req.params;

        const component = await Component.findById(id).populate("created_by", "name email");

        if (!component) {
            return errorResponse(res, 404, responseMessage.not_found, "Component not found");
        }

        return sendResponse(res, 200, responseMessage.success, component);
    } catch (error) {
        return errorResponse(res, 500, responseMessage.something_wrong, error.message);
    }
};

module.exports.updateComponent = async (req, res) => {
    try {
        const { id } = req.params;

        const { component_name, component_type, component_category, default_layout, endpoint=null } = req.body;

        // Validate request body with Joi
        const { error } = componentValidationSchema.validate(req.body);

        if (error) {
            // Collect all validation error messages
            const validationErrors = error.details.map((err) => err.message);
            return errorResponse(res, 400, "Validation Error", validationErrors);
        }

        //existing component check
        const existingComponent = await Component.findOne({component_name:component_name,component_type:component_type })
        if(existingComponent){
            return errorResponse(res, 400, "Component already available with this name", "Component already available with this name");
        }

        const updatedComponent = await Component.findByIdAndUpdate(
            id,
            { $set: {   component_name,
                        component_type,
                        component_category,
                        default_layout,
                        endpoint
                    } 
            },
            { new: true }
        );

        if (!updatedComponent) {
            return errorResponse(res, 404, responseMessage.not_found, "Component not found");
        }

        return sendResponse(res, 200, responseMessage.updated, updatedComponent);
    } catch (error) {
        return errorResponse(res, 500, responseMessage.something_wrong, error.message);
    }
};

module.exports.deleteComponent = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedComponent = await Component.findByIdAndDelete(id);

        if (!deletedComponent) {
            return errorResponse(res, 404, responseMessage.not_found, "Component not found");
        }

        return sendResponse(res, 200, responseMessage.deleted, "Component deleted successfully");
    } catch (error) {
        return errorResponse(res, 500, responseMessage.something_wrong, error.message);
    }
};


// dashbaord management controller



module.exports.addDashboard = async (req, res) => {
    try {
        const { dashboard_name, components } = req.body;

        if(!dashboard_name){
            return errorResponse(res, 400, "Dashboard name not provided", "Dashboard name not provided");
        }

        if(components.length < 1 ){
            return errorResponse(res, 400, "Please provide atleast one component", "Please provide atleast one component");
        }

        //existing dashboard check
        const existingDashboard = await Dashboard.findOne({dashboard_name:dashboard_name})
        if(existingDashboard){
            return errorResponse(res, 400, "Dashboard already available with this name", "Dashboard already available with this name");
        }

        const newDashboard = new Dashboard({
            dashboard_name,
            components,
            created_by: req.user._id 
        });

        await newDashboard.save();

        return sendResponse(res, 201, responseMessage.dashboard_created, newDashboard);
    } catch (error) {
        return errorResponse(res, 500, responseMessage.dashboard_something_wrong, error.message);
    }
};

module.exports.getAllDashboards = async (req, res) => {
    try {

        const options = ["dashboard_name"]
        let filter = getFilter(req, options);
        let query = filter ? filter.query : {};

        const { page, limit, skip, sortOrder } = Paginate(req); 

        const totalCounts = await Dashboard.countDocuments(query);
        const totalPages = Math.ceil(totalCounts / limit);

        const dashboards = await Dashboard.find(query)
            .populate("components")
            .sort(sortOrder)
            .skip(skip)
            .limit(limit);

        // if (!dashboards || dashboards.length === 0) {
        //     return errorResponse(res, 404, responseMessage.no_dashboard_found, responseMessage.no_dashboard_found);
        // }

        if (!dashboards || dashboards.length === 0) {
            return sendResponse(res, 200, dashboards, dashboards);
        }

        const transformDashboards = (dashboards) => {
            return dashboards.map((dashboard) => {
                const widgetCount = dashboard.components.filter(c => c.component_type.toLowerCase() === "widget").length;
                const graphCount = dashboard.components.filter(c => c.component_type.toLowerCase() === "graph").length;
                const tableCount = dashboard.components.filter(c => c.component_type.toLowerCase() === "table").length;
        
                return {
                    _id:dashboard._id,
                    dashboard_name: dashboard.dashboard_name,
                    widgets_count: widgetCount,
                    status: dashboard.status,
                    graphs_count: graphCount,
                    tables_count: tableCount,
                    assigned_user: dashboard.used_count,
                    created_at: dashboard.createdAt,
                };
            });
        };

        const response = transformDashboards(dashboards)

        return sendResponse(res, 200, responseMessage.dashboard_success, {
            response,
            page,
            totalCounts,
            totalPages,
        });

    } catch (error) {
        return errorResponse(res, 500, responseMessage.dashboard_something_wrong, error.message);
    }
};


module.exports.getDashboardById = async (req, res) => {
    try {
        const { id } = req.params;

        const dashboard = await Dashboard.findById(id)
            .populate("components", "component_name component_type default_layout used_count")
            .populate("created_by", "name email");

        if (!dashboard) {
            return errorResponse(res, 404, responseMessage.dashboard_not_found);
        }

        return sendResponse(res, 200, responseMessage.dashboard_success, dashboard);
    } catch (error) {
        return errorResponse(res, 500, responseMessage.dashboard_something_wrong, error.message);
    }
};

module.exports.updateDashboard = async (req, res) => {
    try {
        const { id } = req.params;
        const { dashboard_name, components } = req.body;

        const updatedDashboard = await Dashboard.findById(id)
        if (!updatedDashboard) {
            return errorResponse(res, 404, responseMessage.dashboard_not_found);
        }

        //existing dashboard check
        // const existingDashboard = await Dashboard.findOne({dashboard_name:dashboard_name})
        // if(existingDashboard){
        //     return errorResponse(res, 400, "Dashboard already available with this name", "Dashboard already available with this name");
        // }

        updatedDashboard.dashboard_name = dashboard_name
        updatedDashboard.components = components
        updatedDashboard.updated_by = req.user._id

        const dashboard = await updatedDashboard.save()

        const userWithThisDashboard = await UserDashboard.find({dashboard_id:id})
        if(userWithThisDashboard.length < 1){
            return sendResponse(res, 200, responseMessage.dashboard_updated, {updatedDashboard, message: "This dashboard is not assigned to any user"});
        }

        const updatedComponents = dashboard.components.map(item=>{
            return { 
              componentId: item
            }
        })

        // to remove the component from user dashboard if not in updateComponents list 
        await UserDashboard.updateMany(
            { dashboard_id: id }, 
            {
              $pull: { 
                components: { componentId: { $nin: dashboard.components } } 
              }
            }
        );
      
        // to add the new component in user dashboard component array
        for (const newComponent of updatedComponents) {
            await UserDashboard.updateMany(
              { 
                dashboard_id: id, 
                "components.componentId": { $ne: newComponent.componentId } 
              },
              { 
                $push: { components: newComponent } 
              }
            );
          }
      
        return sendResponse(res, 200, responseMessage.dashboard_updated, updatedDashboard);
    } catch (error) {
        return errorResponse(res, 500, responseMessage.dashboard_something_wrong, error.message);
    }
};

module.exports.deleteDashboard = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedDashboard = await Dashboard.findById(id);

        if (!deletedDashboard) {
            return errorResponse(res, 404, responseMessage.dashboard_not_found);
        }

        const isDashboardAssigned = await Uuser.findOne({assignedDashboard: {$in: [id]}})
        const isDashboardAssigned2 = await Uuser.findOne({assignedDashboard: id})

        if(isDashboardAssigned || isDashboardAssigned2){
            return errorResponse(res, 400, "Assigned dashboard can not be deleted",
                "Assigned dashboard can not be deleted"
            )
        }

        const deletedDashboard2 = await Dashboard.findByIdAndDelete(id);

        return sendResponse(res, 200, responseMessage.dashboard_deleted, deletedDashboard2);
    } catch (error) {
        return errorResponse(res, 500, responseMessage.dashboard_something_wrong, error.message);
    }
};

exports.changeDashboardStatus = async (req, res, next) =>{

    try {
      let dashboardId  = req.query.id;
      let { status } = req.body
      
  
      if(!dashboardId){
        return errorResponse(res, 400, "Dashboard Id not provided", "Dashboard Id not provided");
      }
    //   if(!status){
    //     return errorResponse(res, 400,"Status not provided", "Status not provided");
    //   }
      
  
      const dashboardData = await Dashboard.findOne({ _id: dashboardId });
      // check user if found or not 
      if (!dashboardData) return errorResponse(res, 400, "Dashboard not found", "Dashboard not found");
  
      const result = await Dashboard.updateOne({ _id: dashboardId }, {$set : { status: status}}, 
        {upsert:false});

      // send data to client
      if (!result) return errorResponse(res, 400, "Not able to update dashboard status", responseMessage.errorMessage);
  
      return sendResponse(res, 200, "Dashboard status changed successfully.", result);
  
    } catch (error) {
        return errorResponse(res, 500, responseMessage.errorMessage, error.message);
    }
}

// user-dashboard handling controller

module.exports.addUserDashboard = async (req, res) => {
    try {
        const { dashboard_id, components } = req.body;

        const newUserDashboard = new ({
            dashboard_id,
            components,
        });

        await newUserDashboard.save();

        return sendResponse(res, 201, responseMessage.created, newUserDashboard);
    } catch (error) {
        return errorResponse(res, 500, responseMessage.something_wrong, error.message);
    }
};

module.exports.getAllUserDashboards = async (req, res) => {
    try {
        const userDashboards = await UserDashboard.find()
            .populate("components.componentId", "component_name component_type default_layout used_count");

        return sendResponse(res, 200, responseMessage.success, userDashboards);
    } catch (error) {
        return errorResponse(res, 500, responseMessage.something_wrong, error.message);
    }
};

module.exports.getUserDashboardById = async (req, res) => {
    try {
        const { id } = req.params;

        const userDashboard = await UserDashboard.findById(id)
            .populate("components.componentId", "component_name component_type default_layout used_count");

        if (!userDashboard) {
            return errorResponse(res, 404, responseMessage.not_found);
        }

        return sendResponse(res, 200, responseMessage.success, userDashboard);
    } catch (error) {
        return errorResponse(res, 500, responseMessage.something_wrong, error.message);
    }
};

module.exports.updateUserDashboard = async (req, res) => {
    try {
        const { id } = req.params;
        const components = req.body.components;

        const updatePayload = components.map(item=>{ 
                let obj = { 
                    componentId: item.componentId,
                    user_layout: item.user_layout, 
                    is_user_layout_available: item.is_user_layout_available,
                    is_enabled: item.is_enabled,
                    _id:item._id
                }

                return obj
        })

        const updates = { $set: { components: updatePayload } }

        const updatedUserDashboard = await UserDashboard.findByIdAndUpdate(id, updates, {
            new: true,
        }).populate("components.componentId");

        if (!updatedUserDashboard) {
            return errorResponse(res, 404, "Not found..");
        }

        return sendResponse(res, 200, responseMessage.updated, updatedUserDashboard);
    } catch (error) {
        return errorResponse(res, 500, responseMessage.something_wrong, error.message);
    }
};

module.exports.deleteUserDashboard = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedUserDashboard = await UserDashboard.findByIdAndDelete(id);

        if (!deletedUserDashboard) {
            return errorResponse(res, 404, responseMessage.not_found);
        }

        return sendResponse(res, 200, responseMessage.deleted, deletedUserDashboard);
    } catch (error) {
        return errorResponse(res, 500, responseMessage.something_wrong, error.message);
    }
};









const componentValidationSchema = Joi.object({
    component_name: Joi.string().required().messages({
        "any.required": "Component name is required.",
        "string.empty": "Component name cannot be empty.",
    }),
    component_type: Joi.string()
        .valid('Widget', 'Graph', 'Table')
        .required()
        .messages({
            "any.required": "Component type is required.",
            "any.only": "Component type must be one of: widget, graph, table.",
        }),
    component_category: Joi.string()
        .valid('Business','Content','Operations','MIS', 'QA', 'HR', 'Other')
        .required().messages({
        "any.required": "Component category is required.",
        "string.empty": "Component category cannot be empty.",
    }),
    default_layout: Joi.object({
        w: Joi.string().allow(null),
        h: Joi.string().allow(null),
        x: Joi.string().allow(null),
        y: Joi.string().allow(null),
        widget_order: Joi.number().allow(null),
    }),
    endpoint: Joi.string().optional()
    // .optional().messages({
    //     "any.required": "Endpoint is required.",
    //     "string.empty": "Endpoint cannot be empty."
    // })
});
