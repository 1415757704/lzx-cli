const request = require("@lzx-cli/request");

function getProjectTemplate() {

  return request({
    url: '/project/template',
  });
}

module.exports = {
  getProjectTemplate
}