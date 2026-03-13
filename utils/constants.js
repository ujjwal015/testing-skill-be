const featureList = [
    // client management feature START 
    {
        featureName: "Client Management",
        enabled : false,
        subFeatures: [
            {
                subFeatureName: "Client List",
                enabled : false,
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
            },
            
        ],
    },
    // client management feature END

    // job role management feature START
    {
        featureName: "Job Role Managment",
        enabled : false,
        subFeatures: [
            {
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
                enabled : false,
                subFeatureName: "Job Role List",
          
            }
            
        ],

    },
    // job role management feature END

    // user managment feature START 
    {
        featureName: "User Management",
        enabled : false,
        subFeatures: [
            {
                subFeatureName: "User Login",
                enabled : false,
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
            },
            {
                subFeatureName: "Roles & Permission",
                enabled : false,
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
            },
            {
                subFeatureName: "Dashboard Management",
                enabled : false,
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
            }    
                
          
            
        ],
    },

    // user management feature End

    //assessor management feature start 
    {
        featureName: "Assessor",
        enabled : false,
        subFeatures: [
            {
                subFeatureName: "Assessor List",
                enabled : false,
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
            }
        ],
    },
    // assessor management feature end 

    //question bank managment feature start 
    {
        featureName: "Question Bank Management",
        enabled : false,
        subFeatures: [
            {
                subFeatureName: "Question Bank List",
                enabled : false,
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
            },
            {
                subFeatureName: "Nos List",
                enabled : false,
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
            }
        ],
    },
    // question bank management feature end

    //exam managment feature start 
    {
        featureName: "Exam Management",
        enabled : false,
        subFeatures: [
            {
                subFeatureName: "Exam Center",
                enabled : false,
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
            },
            {
                subFeatureName: "Batch",
                enabled : false,
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
            },
            {
                subFeatureName: "Assign Candidate List",//"Assign Batch",
                enabled : false,
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
            },
            {
               
                subFeatureName: "Preview Assessment List",//"Assessment List",
                enabled : false,
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
                
          
            },
            {
               
                subFeatureName: "Batch Request List",
                enabled : false,
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
                
          
            },
            {
               
                subFeatureName: "Batch Status List",
                enabled : false,
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
                
          
            }
        ],
    },
    // exam management feature end 

    //result feature start 
    {
        featureName: "Result",
        enabled : false,
        subFeatures: [
            {
                subFeatureName: "Online Result",
                enabled : false,
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
            },
            {
                subFeatureName: "Offline Result",
                enabled : false,
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
            },
        ],
    },
    //resutl feature end 

    // admin console feature start 
    {
        featureName: "Admin Console", 
        enabled: false, 
        subFeatures: [
            {
                subFeatureName: "First Console",
                enabled : false,
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
            }
        ]
    },

    // admin console feature end

    //log management feature start 
    {
        featureName: "Log Management",
        enabled : false,
        subFeatures: [
            {
                subFeatureName: "Proctoring Logs",
                enabled : false,
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
            },
            {
                subFeatureName: "Activity Logs",
                enabled : false,
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
            }
        ],
    },
    // log managment feature end


    // proctor management 
    {
        featureName: "Proctor Managment",
        enabled : false,
        subFeatures: [
            {
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
                enabled : false,
                subFeatureName: "Proctor List",
          
            }
            
        ],

    },
    // proctor management end here

    // scheme management start here 

    {
        featureName: "Scheme Managment",
        enabled : false,
        subFeatures: [
            {
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
                enabled : false,
                subFeatureName: "Scheme List",
          
            },
            {
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
                enabled : false,
                subFeatureName: "Sub Scheme List",
          
            }
            
        ],

    },
    // scheme management ends here 

    //instruction Managment start here 
    {
        featureName: "Instruction Managment",
        enabled : false,
        subFeatures: [
            {
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
                enabled : false,
                subFeatureName: "Instruction List",
          
            }
            
        ],

    },
    // instruction management ends here 

    // dashboard management start here

    {
        featureName: "Dashboard",
        enabled : true,
        subFeatures: [
            {
                permissions: {
                    view: true,
                    add: true,
                    edit: true,
                    delete: true,
                    export: true,
                    status: true
                },
                enabled : true,
                subFeatureName: "Assigned Dashboard",
          
            }       
        ],

    },

    // dashboard management ends here 


    // lead management start here 
    {
        featureName: "Leads Managment",
        enabled : false,
        subFeatures: [
            {
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
                enabled : false,
                subFeatureName: "Leads List",
          
            }
            
        ],

    },

    // lead management ends here 

    // verification tab start here 
    {
        featureName: "Verification Tab",
        enabled : false,
        subFeatures: [
            {
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
                enabled : false,
                subFeatureName: "Leads List",
          
            }
            
        ],

    },

    // verfification tab ends here 

    // attendance tab starts here
    
    {
        featureName: "Attendance Tab",
        enabled : false,
        subFeatures: [
            {
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
                enabled : false,
                subFeatureName: "Attendance List",
          
            }
            
        ],

    },


    // attendance tab ends here

    //    Skill Assesemtn Old platform
    {
        featureName: "Skill Assessment",
        enabled : false,
        subFeatures: [
            {
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
                enabled : false,
                subFeatureName: "Batch",
          
            },
            {
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
                enabled : false,
                subFeatureName: "All Candidates",
          
            },
            {
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
                enabled : false,
                subFeatureName: "Assessors",
          
            },
            {
                permissions: {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                    status: false
                },
                enabled : false,
                subFeatureName: "Results",
          
            },
            
        ],

    },
    

]


module.exports = { featureList }