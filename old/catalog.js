function jquery_dom(a, b) {
  if (b) {
    return $('#' + a + b);
  }
  return $('#' + a);
}

function show_pre_in_dom(show_dom, json_obj, text) {
  show_dom.html('');
  if (text) {
    const p = $('<p>');
    p.html(text);
    show_dom.append(p);
  }
  if (json_obj) {
    const pre = $('<pre class="text-left">');
    pre.html(JSON.stringify(json_obj, undefined, 2));
    show_dom.append(pre);
  }
}

const _CONSTANTS = {
  endpoint: 'apiEndpoint',
  key: 'securityKey',
  project: 'projectId',
  location: 'location',
  op_input: 'operationId',
  op_button: 'operationButton',
  op_show: 'showOperation',
  csv: 'csv',
  beta: 'https://vision.googleapis.com/v1p4beta1',
  prod: 'https://vision.googleapis.com/v1',
};

const _COMMON_CONFIG = (function() {
  function read_json_key(input, config) {
    config.key = '';
    if (input.files && input.files[0]) {
      let reader = new FileReader();
      reader.onload = function(e) {
        config.key = e.target.result;
        const key_obj = JSON.parse(config.key);
        if (key_obj) {
          jquery_dom(_CONSTANTS.project).val(key_obj.project_id);
        }
      };
      reader.readAsText(input.files[0]);
    }
  }

  var config = {
    key: '',
    endpoint: '',
    location: '',
    project_id: '',
  };
  config.fill = function() {
    config.endpoint = jquery_dom(_CONSTANTS.endpoint).val();
    config.location =
        $('input[name="' + _CONSTANTS.location + '"]:checked').val();
    config.project_id = jquery_dom(_CONSTANTS.project).val();
  };
  jquery_dom(_CONSTANTS.key).change(function() {
    read_json_key(jquery_dom(_CONSTANTS.key)[0], config);
  });
  $('input:radio[name=endpoint]').on('change', function() {
    const checked_val = $('input:radio[name=endpoint]:checked').val();
    jquery_dom(_CONSTANTS.endpoint).val(_CONSTANTS[checked_val]);
  });

  config.is_valid = function() {
    return !config.error();
  };
  config.error = function() {
    if (!/^https[://].+googleapis[.]com[/][a-z1-9]+$/.test(config.endpoint)) {
      return 'Invalid endpoint: ' + config.endpoint;
    }
    if (!/^[^ ]+$/.test(config.project_id)) {
      return 'Invalid project id: ' + config.project_id;
    }
    if (!/^[a-z1-9-]+$/.test(config.location)) {
      return 'Invalid location: config.location';
    }
    if (!config.key || !JSON.parse(config.key)) {
      return 'Service account key needs to be json format: ' + config.key;
    }
    return '';
  };
  config.get_endpoint_no_version = function() {
    return config.endpoint.match(/^https[://].+googleapis[.]com/);
  };

  exp = {};
  exp.getconfig = function() {
    config.fill();
    return config;
  };
  return exp;
})();


(function() {

const input_dom = jquery_dom(_CONSTANTS.op_input);
const button_dom = jquery_dom(_CONSTANTS.op_button);
const show_dom = jquery_dom(_CONSTANTS.op_show);

function is_valid_operation(val) {
  return /^locations[/][a-z1-9-]+[/]operations[/][^/]+$/.test(val);
}

function is_valid() {
  return is_valid_operation(input_dom.val());
}

function show(s) {
  show_dom.html(s);
}

function show_button_or_not() {
  if (is_valid()) {
    button_dom.removeAttr('disabled');
  } else {
    button_dom.attr('disabled', true);
    show('');
  }
}

input_dom.on('change input paste', show_button_or_not);

button_dom.click(function() {
  const config = _COMMON_CONFIG.getconfig();
  if (!config.is_valid()) {
    show(config.error());
    return;
  }
  if (!is_valid()) {
    show('Invalid operation format: ' + input_dom.val());
    return;
  }
  show('');
  fetch_status_and_show(config, input_dom.val(), show_dom);
});

function fetch_status_and_show(config, operation_id, show_dom) {
  function show_pre_error(json_obj, url) {
    const p = $('<p>');
    p.html('GET ' + url);
    const pre = $('<pre class="text-left">');
    pre.html(JSON.stringify(json_obj, undefined, 2));
    show_dom.html('');
    show_dom.append(p);
    show_dom.append(pre);
  }

  const operation_url =
      config.get_endpoint_no_version() + '/v1/' + operation_id;
  console.log(operation_url);
  $.ajax({
     url: '/getOperation',
     type: 'POST',
     data: JSON.stringify({
       operation_url: operation_url,
       key: config.key,
     }),
     cache: false,
     contentType: 'application/json',
     dataType: 'json',
   }).done(function(response) {
    if (!response.success) {
      show_pre_error(response, operation_url);
      return;
    }
    const result = response.response;
    if (result.error) {
      console.log(response);
    }
    show_pre_error(result, operation_url);
  });
}
})();


(function() {
$('.toggle').click(function() {
  const target = $(this).attr('toggle_target');
  const dom = $(target)[0];
  if (dom.style.display == 'none') {
    dom.style.display = '';
  } else {
    dom.style.display = 'none';
  }
});
})();


(function() {
const CSV_DOM = jquery_dom(_CONSTANTS.csv);
const ORIGINAL_CHILD = CSV_DOM.children().first().clone();
const ALL_HANDLERS = [];

function num_child() {
  return CSV_DOM.children().length;
}

function get_child(dom, name) {
  return dom.children('[name="' + name + '"]');
}

function add_dom(new_dom, exist_dom) {
  ALL_HANDLERS.push(new ImportHandler(new_dom));
  exist_dom.before(new_dom);
}

function fill_handlers(div_dom, handler) {
  get_child(div_dom, 'add').click(function() {
    const new_dom = ORIGINAL_CHILD.clone();
    add_dom(new_dom, div_dom);
  });
  get_child(div_dom, 'remove').click(function() {
    if (num_child() == 1) {
      add_dom(ORIGINAL_CHILD.clone(), div_dom);
    }
    handler.remove();
    div_dom.remove();
  });
  get_child(div_dom, 'input').on('change input paste', function() {
    if (/^gs:[//][\^/].+[/].+$/.test($(this).val())) {
      get_child(div_dom, 'submit').removeAttr('disabled');
    } else {
      get_child(div_dom, 'submit').attr('disabled', true);
    }
  });
  get_child(div_dom, 'submit').click(function() {
    handler.post();
    get_child(div_dom, 'input').attr('disabled', true);
  });
}

var ImportHandler = function(div_dom) {
  this.div_dom = div_dom;
  this.result_dom = get_child(this.div_dom, 'result');
  this.operation_status_dom = get_child(this.div_dom, 'operation_status');
  this.status_check_internal_seconds = 5;

  fill_handlers(this.div_dom, this);
  this.operation_url = '';
  this.config = null;
  this.stop = false;
  this.start_check_status = false;
};
ImportHandler.prototype.gcs_uri = function() {
  return get_child(this.div_dom, 'input').val();
};
ImportHandler.prototype.post = function() {
  if (this.start_check_status) {
    return;
  }
  const config = _COMMON_CONFIG.getconfig();
  if (!config.is_valid()) {
    this.show_message(config.error());
    return;
  }
  this.config = config;
  const url_for_import = config.endpoint + '/projects/' + config.project_id +
      '/locations/' + config.location + '/productSets:import';
  const gcs_uri = this.gcs_uri();
  const key = this.config.key;
  const slf = this;
  $.ajax({
     url: '/importCsv',
     type: 'POST',
     data: JSON.stringify({
       url_for_import: url_for_import,
       gcs_uri: gcs_uri,
       key: key,
     }),
     cache: false,
     contentType: 'application/json',
     dataType: 'json',
   }).done(function(response) {
    if (!response.success) {
      return show_pre_in_dom(
          slf.result_dom, response, 'Post to ' + url_for_import);
    }
    const result = response.response;
    if (result) {
      const copy_dom = new CopyDomClass(result.name, 'Copy operation id');
      slf.result_dom.empty();
      slf.result_dom.append(copy_dom.dom())
          .append($('<span>').append(result.name));
      slf.operation_url =
          config.get_endpoint_no_version() + '/v1/' + result.name;
      slf.check_status();
    }
  });
  slf.show_message('Start calling backend.');
};
ImportHandler.prototype.show_message = function(message) {
  this.result_dom.html(message);
};
ImportHandler.prototype.check_status = function() {
  this.start_check_status = true;
  const operation_url = this.operation_url;
  if (this.stop || !operation_url) {
    return;
  }

  const key = this.config.key;
  const slf = this;
  $.ajax({
     url: '/getOperation',
     type: 'POST',
     data: JSON.stringify({
       operation_url: operation_url,
       key: key,
     }),
     cache: false,
     contentType: 'application/json',
     dataType: 'json',
   }).done(function(response) {
    const result = response.response;
    if (!response.success || !result) {
      console.log(response);
    } else {
      if (result.done) {
        show_pre_in_dom(slf.operation_status_dom, result, 'Operation DONE!');
      } else {
        const img = $('<img>').attr('src', '/static/spinner-white.gif');
        img.width(80).height(80);
        slf.operation_status_dom.empty();
        slf.operation_status_dom.append(img);
      }
    }
    if (!result.done) {
      setTimeout(function() {
        slf.check_status();
      }, slf.status_check_internal_seconds * 1000);
    }
  });
};
ImportHandler.prototype.remove = function() {
  this.stop = true;
};

ALL_HANDLERS.push(new ImportHandler(CSV_DOM.children().first()));
})();


const CopyDomClass = (function() {
  function copyToClipboard(text) {
    // Create a "hidden" input
    var aux = document.createElement('input');
    // Assign it the value of the specified element
    aux.setAttribute('value', text);
    // Append it to the body
    document.body.appendChild(aux);
    // Highlight its content
    aux.select();
    // Copy the highlighted text
    document.execCommand('copy');
    // Remove it from the body
    document.body.removeChild(aux);
  }


  function gettooltip(html) {
    const tooltip = html.children('button').children('span');
    return tooltip;
  }

  const CopyDomClass = function(copyText, buttonText) {
    const slf = this;
    this.copyText = copyText;
    this.html = $('<div class="tooltip">')
                    .append($('<button>')
                                .append($('<span class="tooltiptext">')
                                            .html('Copy to clipboard'))
                                .append(buttonText));
    this.html.children('button').on('click', function() {
      copyToClipboard(copyText);
      gettooltip(slf.html).html('Copied!');
    });
    this.html.children('button').on('mouseout', function() {
      gettooltip(slf.html).html('Copy to clipboard');
    });
    this.dom = function() {
      return slf.html;
    };
  };

  return CopyDomClass;
})();
