let handlebars = require('handlebars');

function escapeForHTML(unsafeText) {
    return unsafeText.replace(/[&<"']/g, function(char) {
      switch (char) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '"':
          return '&quot;';
        default:
          return '&#039;';
      }
    });
  };

module.exports = function (field_info) {
  let html = '';
  let field_value = '';
  let escaped_id = escapeForHTML(field_info.id);
  let escaped_label = escapeForHTML(field_info.label);
  let css_classes = (field_info.required) ? 'registration-field required ' : 'registration-field';
  if (field_info.defaultValue)
    field_value = escapeForHTML(field_info.defaultValue);
  if (field_info.initialValue)
    field_value = escapeForHTML(field_info.initialValue);

  switch (field_info.type.toLowerCase()) {
    case "text":
    case "email":
    case "date":
    case "phone":
      html = '' +
        '<div class="float-label">' +
        '  <input type="' + field_info.type.toLowerCase() + '"' +
        '         class="' + css_classes + ' text-input float-label__input"' +
        '         id="' + escaped_id + '"' +
        '         name="' + escaped_id + '"' +
        '         placeholder="' + escaped_label + '"' +
        '         value="' + field_value + '"' +
        ((field_info.readonly) ? " disabled" : "") +
        '  />' +
        '  <label class="float-label__label"' +
        '         for="' + escaped_id + '">' + escaped_label +
        '  </label>' +
        '</div>';
      return new handlebars.SafeString(html);
    case "dropdown":
      html = '' +
        '<div class="dropdown float-label dropdown--standard" data-id="dropdown">' +
        '  <select id="' + escaped_id + '"' +
        '          name="' + escaped_id + '"' +
                   ((field_info.readonly) ? " disabled" : "") +
        '          class="' + css_classes + ' dropdown__select float-label__input">' +
        '    <option disabled="" ' + ((field_value) ? '' : ' selected="selected" ') + ' value="">Select one</option>';
      field_info.options.forEach(option => {
        let selected = ((field_value === option) ? 'selected' : "");
        html += '<option value="' + option + '" ' + selected + '>' + option + '</option>';
      });
      html += '  </select>' +
        '  <label class="float-label__label"' +
        '         for="' + escaped_id + '">' + escaped_label + '</label>' +
        '</div>';

      return new handlebars.SafeString(html);
    case "checkbox":
      html = '' +
        '<div class="' + css_classes + ' checkbox__single">' +
          '<label class="checkbox"' +
          '       for="' + escaped_id + '">' +
          '  <input type="checkbox"' +
          '         class="' + css_classes + ' checkbox__input"' +
          '         id="' + escaped_id + '"' +
          '         name="' + escaped_id + '"' +
                    ((field_value.toLowerCase() === 'true' || field_value.toLowerCase() === 'on') ? 'checked' : '') +
                    ((field_info.readonly) ? " disabled " : "") +
          '  />' +
          '    <span class="checkbox__standin"></span>' +
          '    <span class="checkbox__label">' + escaped_label + '</span>' +
          '</label>' +
        '</div>';
      return new handlebars.SafeString(html);
    case "checkbox group":
      html = '<div class="checkbox__group__label">' + escaped_label + '</div>' +
                '<div class="' + css_classes + ' checkbox__group">';
      field_info.options.forEach(option => {
        html +=
          '<div class="checkbox_group_labels">' +
          '    <label class="checkbox"' +
          '           for="' + escaped_id + option + '">' +
          '    <input type="checkbox"' +
          '           class="' + css_classes + ' checkbox__input"' +
          '           id="' + escaped_id + option + '"' +
          '           name="' + escaped_id + '"' +
          '           value="' + option + '"' +
                      ((field_info.readonly) ? " disabled" : "") +
          '/>' +
          '        <span class="checkbox__standin"></span>' +
          '        <span class="checkbox__label">' + option + '</span>' +
          '    </label>' +
          '</div>';
      });
      html += '</div>'
      return new handlebars.SafeString(html);

    case "hidden":
      return;
    default:
      console.log("Unsupported field type: " + field_info.type);
      return;
  }
};