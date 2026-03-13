const { featureList } = require("./constants");

exports.getPersmission = async (userRole) => { 

      const resultArray = JSON.parse(JSON.stringify(userRole));

      const mergedResultsArray = [];

      resultArray.forEach((resultObject) => {
        const features = resultObject.features;

        features.forEach((feature) => {
          const existingFeature = mergedResultsArray.find(
            (mergedFeature) => mergedFeature.featureName === feature.featureName
          );

          if (!existingFeature) {
            // if the feature doesn't exist in the mergedResultsArray, add it
            mergedResultsArray.push({
              featureName: feature.featureName,
              enabled: feature.enabled,
              subFeatures: feature.subFeatures,
            });
          } else {
            // if the feature already exists in the mergedResultsArray, update it
            existingFeature.enabled =
              existingFeature.enabled || feature.enabled;

            // merge subFeatures by comparing and updating permissions
            feature.subFeatures.forEach((subFeature) => {
              const matchingSubFeature = existingFeature.subFeatures.find(
                (existingSubFeature) =>
                  existingSubFeature.subFeatureName ===
                  subFeature.subFeatureName
              );

              if (matchingSubFeature) {
                // Merge permissions for the matching subFeature
                matchingSubFeature.permissions = mergePermissions(
                  matchingSubFeature.permissions,
                  subFeature.permissions
                );
              } else {
                // if subFeature doesn't exist, add it
                existingFeature.subFeatures.push(subFeature);
              }
            });
          }
        });
      });

      // function to merge permissions for two subFeatures
      function mergePermissions(existingPermissions, newPermissions) {
        // set a permission to true if it's true in either set of permissions
        return Object.keys(newPermissions).reduce((merged, permission) => {
          merged[permission] =
            existingPermissions[permission] || newPermissions[permission];
          return merged;
        }, existingPermissions);
      }

      const arrayC = mergeArrays(featureList, mergedResultsArray);

      function convertStringToFormat(inputString) {
        return inputString
          .split(" ")
          .map((word) => word.substr(0, 2).toUpperCase())
          .join("");
      }

      function convertPermissions(permissions) {
        const convertedPermissions = {};
        for (const key in permissions) {
          let newKey;
          switch (key) {
            case "view":
              newKey = "1";
              break;
            case "add":
              newKey = "2";
              break;
            case "edit":
              newKey = "3";
              break;
            case "delete":
              newKey = "4";
              break;
            case "export":
              newKey = "5";
              break;
            case "status":
              newKey = "6";
              break;
            default:
              newKey = key; // Keep the key as is if not recognized
          }
          convertedPermissions[newKey] = permissions[key];
        }
        return convertedPermissions;
      }

      // to change the userRole obj with short forms
      const transformedUserRole = arrayC.map((role) => {
        const featureName = convertStringToFormat(role.featureName);
        const subFeatures = role.subFeatures.map((subFeature) => ({
          subFeatureName: convertStringToFormat(subFeature.subFeatureName),
          enabled: subFeature.enabled,
          permissions: convertPermissions(subFeature.permissions),
        }));
        return {
          featureName,
          enabled: role.enabled,
          subFeatures,
        };
      });

      

      return transformedUserRole
}


function mergeArrays(arrayA, arrayB) {
  const mergedArray = arrayA.map((itemA) => {
    const matchingItemB = arrayB.find(
      (itemB) => itemB.featureName === itemA.featureName
    );

    if (matchingItemB) {
      return mergeObjects(itemA, matchingItemB);
    } else {
      // console.log("itemA-->", itemA)
      // console.log("{...itemA} --> ", { ...itemA})

      return { ...itemA };
    }
  });

  return mergedArray;
}

function mergeObjects(obj1, obj2) {
  const merged = { ...obj1 };

  for (const key in obj2) {
    if (typeof obj2[key] === "object" && !Array.isArray(obj2[key])) {
      // Merge nested objects
      merged[key] = { ...obj1[key], ...obj2[key] };
    } else if (
      key === "subFeatures" &&
      Array.isArray(obj1[key]) &&
      Array.isArray(obj2[key])
    ) {
      // Merge subFeatures
      const subFeatureMap = new Map();

      for (const subFeature of obj1[key]) {
        subFeatureMap.set(subFeature.subFeatureName, subFeature);
      }

      for (const subFeature of obj2[key]) {
        const existingSubFeature = subFeatureMap.get(subFeature.subFeatureName);
        if (existingSubFeature) {
          subFeatureMap.set(subFeature.subFeatureName, {
            ...existingSubFeature,
            ...subFeature,
          });
        } else {
          subFeatureMap.set(subFeature.subFeatureName, subFeature);
        }
      }

      merged[key] = [...subFeatureMap.values()];
    } else {
      // Copy other properties directly
      merged[key] = obj2[key];
    }
  }

  return merged;
}