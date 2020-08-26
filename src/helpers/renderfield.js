let handlebars = require('handlebars');

module.exports = function (field_info) {
  let html = '';
  let field_value = '';
  let css_classes = (field_info.required) ? 'registration-field required ' : 'registration-field';
  if (field_info.defaultValue)
    field_value = field_info.defaultValue;
  if (field_info.initialValue)
    field_value = field_info.initialValue;

  switch (field_info.type.toLowerCase()) {
    case "text":
    case "email":
    case "date":
    case "phone":
      html = '' +
        '<div class="float-label">' +
        '  <input type="' + field_info.type.toLowerCase() + '"' +
        '         class="' + css_classes + ' text-input float-label__input"' +
        '         id="' + field_info.id + '"' +
        '         name="' + field_info.id + '"' +
        '         placeholder="' + field_info.label + '"' +
        '         value="' + field_value + '"' +
        ((field_info.readonly) ? " disabled" : "") +
        '  />' +
        '  <label class="float-label__label"' +
        '         for="' + field_info.id + '">' + field_info.label +
        '  </label>' +
        '</div>';
      return new handlebars.SafeString(html);
    case "dropdown":
      html = '' +
        '<div class="dropdown float-label">' +
        '  <select id="' + field_info.id + '"' +
        '          name="' + field_info.label + '"' +
                   ((field_info.readonly) ? " disabled" : "") +
        '          class="' + css_classes + ' dropdown__select float-label__input placeholder-shown">' +
        '    <option disabled="" value="">Select one</option>';
      field_info.options.forEach(option => {
        let selected = ((field_value === option) ? 'selected' : "");
        html += '<option value="' + option + '" ' + selected + '>' + option + '</option>';
      });
      html += '  </select>' +
        '  <label class="float-label__label"' +
        '         for="' + field_info.id + '">' + field_info.label + '</label>' +
        '</div>';

      return new handlebars.SafeString(html);
    case "checkbox":
      html = '' +
        '<label class="checkbox"' +
        '       for="' + field_info.id + '">' +
        '  <input type="checkbox"' +
        '         class="' + css_classes + ' checkbox__input"' +
        '         id="' + field_info.id + '"' +
        '         name="' + field_info.id + '"' +
                  ((field_value.toLowerCase() === 'true' || field_value.toLowerCase() === 'on') ? 'checked' : '') +
                  ((field_info.readonly) ? " disabled " : "") +
        '  />' +
        '    <span class="checkbox__standin"></span>' +
        '    <span class="checkbox__label">' + field_info.label + '</span>' +
        '</label>';
      return new handlebars.SafeString(html);
    case "checkbox group":
      html = '<div class="checkbox__label">' + field_info.label + '</div>';
      field_info.options.forEach(option => {
        html +=
          '<div class="checkbox_group_labels">' +
          '    <label class="checkbox"' +
          '           for="' + field_info.id + option + '">' +
          '    <input type="checkbox"' +
          '           class="' + css_classes + ' checkbox__input"' +
          '           id="' + field_info.id + option + '"' +
          '           name="' + field_info.id + '"' +
          '           value="' + option + '"' +
                      ((field_info.readonly) ? " disabled" : "") +
          '/>' +
          '        <span class="checkbox__standin"></span>' +
          '        <span class="checkbox__label">' + option + '</span>' +
          '    </label>' +
          '</div>';
      });
      return new handlebars.SafeString(html);

    case "hidden":
      return;
    default:
      console.log("Unsupported field type: " + field_info.type);
      return;
  }
};