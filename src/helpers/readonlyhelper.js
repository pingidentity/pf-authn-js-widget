module.exports = function(condition) {
  console.log(' got condition: ' + condition);
  return condition === undefined || condition === true ? "" : "readonly";
};
