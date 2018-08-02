exp = {};


(function() {
var _canvasDomId = '';
var _bboxhandler = null;

var _mouse = {x: 0, y: 0, startX: 0, startY: 0};
var _element = null;
var _boundingPoly = {x_min: 0, y_min: 0, x_max: 0, y_max: 0};

function getCanvasOffset() {
  const offset = $('#' + _canvasDomId).offset();
  if (window.pageYOffset) {
    offset.top += window.pageYOffset;
    offset.left += window.pageXOffset;
  } else if (document.body.scrollTop) {
    offset.top += document.body.scrollTop;
    offset.left += document.body.scrollLeft;
  }
  return offset;
}

function getCanvasImage() {
  return $('#' + _canvasDomId + ' img');
}

function min(a, b) {
  return a < b ? a : b;
}

function max(a, b) {
  return a > b ? a : b;
}

function setMousePosition(e) {
  var ev = e || window.event;  // Moz || IE
  if (ev.pageX) {              // Moz
    _mouse.x = ev.pageX + window.pageXOffset;
    _mouse.y = ev.pageY + window.pageYOffset;
  } else if (ev.clientX) {  // IE
    _mouse.x = ev.clientX + document.body.scrollLeft;
    _mouse.y = ev.clientY + document.body.scrollTop;
  }
};

function initDraw(canvas_dom_id, bboxhandler) {
  _canvasDomId = canvas_dom_id;
  _bboxhandler = bboxhandler;
  const canvas = $('#' + _canvasDomId)[0];
  canvas.onmousemove = function(e) {
    e.preventDefault();
    setMousePosition(e);
    if (_element !== null) {
      const canvasImage = getCanvasImage();
      _element.style.visibility = 'visible';
      const left = min(_mouse.x, _mouse.startX) - getCanvasOffset().left;
      const top = min(_mouse.y, _mouse.startY) - getCanvasOffset().top -
          canvasImage.height();
      const height = Math.abs(_mouse.y - _mouse.startY);
      const width = Math.abs(_mouse.x - _mouse.startX)
      _element.style.left = left + 'px';
      _element.style.top = top + 'px';
      _element.style.height = height + 'px';
      _element.style.width = width + 'px';
      _boundingPoly.x_min = max(0, left / canvasImage.width());
      _boundingPoly.x_max = min(1, (left + width) / canvasImage.width());
      _boundingPoly.y_min =
          max(0, (top + canvasImage.height()) / canvasImage.height());
      _boundingPoly.y_max =
          min(1, (top + canvasImage.height() + height) / canvasImage.height());
      if (bboxhandler) {
        _bboxhandler(_boundingPoly);
      }
    }
  };

  canvas.onmousedown = function(e) {
    e.preventDefault();
    console.log('begin.');
    // Remove all div inside the canvas.
    $('#' + _canvasDomId + ' div').remove();
    if (_bboxhandler) {
      _bboxhandler('');
    }
    setMousePosition(e);
    _mouse.startX = _mouse.x;
    _mouse.startY = _mouse.y;
    _element = document.createElement('div');
    _element.className = 'rectangle'
    _element.style.visibility = 'hidden';
    canvas.appendChild(_element)
  };

  canvas.onmouseup = function(e) {
    e.preventDefault();
    _element = null;
    console.log('finsihed.');
  };
}

exp.initDraw = initDraw;
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


(function() {

function getEndpoint(env) {
  const map = {
    alpha: 'https://alpha-vision.googleapis.com/v1',
    beta: 'https://vision.googleapis.com/v1p3beta1',
  };
  return map[env];
}

var ConfigModel = Backbone.Model.extend({

  getEndpointNoVersion: function() {
    return this.get('endpoint').match(/^https[://].+googleapis[.]com/);
  },

  readJson: function(input_dom) {
    if (input_dom.files && input_dom.files[0]) {
      let reader = new FileReader();
      reader.onload = function(e) {
        const new_key = e.target.result;
        const key_obj = JSON.parse(new_key);
        if (key_obj && key_obj.project_id) {
          this.set('key', new_key);
          this.set('project_id', key_obj.project_id);
        }
      }.bind(this);
      reader.readAsText(input_dom.files[0]);
    }
  },

  valid: function() {
    return !this.error();
  },

  getEndpoint: function(env) {
    return getEndpoint(env);
  },

  error: function() {
    if (!/^https[://].+googleapis[.]com[/][a-z1-9]+$/.test(
            this.get('endpoint'))) {
      return 'Invalid endpoint.';
    }
    if (!/^[^ ]+$/.test(this.get('project_id'))) {
      return 'Invalid project id.';
    }
    if (!/^[a-z1-9-]+$/.test(this.get('location'))) {
      return 'Invalid location.';
    }
    if (!this.get('key') || !JSON.parse(this.get('key'))) {
      return 'Service account key needs to be json format.';
    }
    return '';
  },

  defaults: {
    'endpoint': getEndpoint('beta'),
    'key': '',
    'location': 'us-west1',
    'project_id': '',
  },
});

exp.CONFIG_MODEL = new ConfigModel();
})();

(function() {
var SearchImageModel = Backbone.Model.extend({

  config_model: exp.CONFIG_MODEL,

  defaults: {
    'image_blob': null,
    'product_set_id': '',
    'product_category': 'homegoods',
    'max_items': 10,
    'bounding_poly': '',
    'error': '',
    'index_time': '',
    'num_matches': 0,
    'results': null,
  },

  processResponse: function(response) {
    if (!response.responses) {
      this.set('error', 'No matches found!');
      return;
    }

    for (const singleResponse of response.responses) {
      if (singleResponse.error) {
        this.set('error', singleResponse.error.message);
        return;
      }
      const numMatches = singleResponse.productSearchResults.results.length;

      if (numMatches === 0) {
        this.set('error', 'No matches found from productSearchResults!');
        return;
      }
      this.set(
          'index_time',
          'Product set index time: ' +
              singleResponse.productSearchResults.indexTime);

      this.set('results', singleResponse.productSearchResults.results);
      this.set('num_matches', numMatches);
      for (let i = 0; i < numMatches; i++) {
        this.getImage(singleResponse.productSearchResults.results[i], i);
      }
    }
  },

  getImage: function(result, index) {
    let fullName = result.image;

    $.ajax({
       url: '/getMatchedImage',
       type: 'POST',
       data: JSON.stringify({
         name: fullName,
         index: index,
         key: this.config_model.get('key'),
         endpoint: this.config_model.get('endpoint'),
       }),
       cache: false,
       contentType: 'application/json',
       dataType: 'json',
     }).done(function(response) {
      this.set('image-' + index, response);
    }.bind(this));
  },
  clear: function() {
    this.set('error', '');
    const num_matches = this.get('num_matches');
    this.set('num_matches', 0);
    for (i = 0; i < num_matches; i++) {
      this.set('image-' + i, null);
    }
  },

  search: function() {
    this.clear();
    const error = this.config_model.error();
    if (error) {
      this.set('error', error);
      return;
    }
    if (!this.get('image_blob')) {
      this.set('error', 'No image file.');
      return;
    }
    if (!this.get('product_set_id')) {
      this.set('error', 'No product set id.');
      return;
    }
    if (!this.get('product_category')) {
      this.set('error', 'No product category.');
      return;
    }
    const max_items = this.get('max_items');
    if (max_items <= 0 || max_items > 200) {
      this.set('error', 'Max items should be between 1 and 200.');
      return;
    }
    const full_project_set_id = 'projects/' +
        this.config_model.get('project_id') + '/locations/' +
        this.config_model.get('location') + '/productSets/' +
        this.get('product_set_id');
    var fd = new FormData();
    fd.append('key', this.config_model.get('key'));
    fd.append('imageBlob', this.get('image_blob'));
    fd.append('productSet', full_project_set_id);
    fd.append('category', this.get('product_category'));
    fd.append('endpoint', this.config_model.get('endpoint'));
    fd.append('size', max_items);
    fd.append('boundingPoly', this.get('bounding_poly'));

    $.ajax({
       type: 'POST',
       url: 'productSearch',
       data: fd,
       processData: false,
       contentType: false,
     }).done(function(data) {
      const json_data = JSON.parse(data);
      if (json_data.hasOwnProperty('error')) {
        console.log(json_data['error']);
      } else if (json_data['response'].hasOwnProperty('error')) {
        console.log(JSON.stringify(json_data['response']['error']));
      } else {
        this.processResponse(json_data['response']);
      }
    }.bind(this));
    console.log('Processing...');
  }
});

exp.search_image_model = new SearchImageModel();
})();

(function() {

const ConfigView = Backbone.View.extend({
  initialize: function() {
    this.model = exp.CONFIG_MODEL;
  },

  render: function() {
    this.$el.html(this.template({endpoint: this.model.get('endpoint')}));
    this.$('input[name=endpoint]').change(this.updateEndpoint.bind(this));
    this.$('#endpoint-text').change(this.updateText.bind(this));
    return this;
  },

  updateEndpoint: function(e) {
    const checked_val = $(e.target).val();
    this.$('#endpoint-text').val(this.model.getEndpoint(checked_val)).change();
  },

  updateText: function(e) {
    this.model.set('endpoint', $(e.target).val());
    console.log(this.model.get('endpoint'));
  },

  template: _.template($('#config_template').html()),
});

const ServiceAccountView = Backbone.View.extend({
  initialize: function() {
    this.model = exp.CONFIG_MODEL;
  },
  render: function() {
    this.$el.html(this.template());
    this.$('#service-account-key')
        .change(this.updateServiceAccountJson.bind(this));
    this.$('#project-id').change(this.updateProjectId.bind(this));
    this.model.on('change:project_id', this.fillProjectId, this);
    return this;
  },
  updateProjectId: function(e) {
    this.model.set('project_id', $(e.target).val());
  },
  fillProjectId: function() {
    this.$('#project-id').val(this.model.get('project_id'));
  },
  updateServiceAccountJson: function(e) {
    this.model.readJson(e.target);
  },
  template: _.template($('#account_template').html()),
});


const LocationView = Backbone.View.extend({
  initialize: function() {
    this.model = exp.CONFIG_MODEL;
  },
  render: function() {
    this.$el.html(this.template());
    this.$('input[name=location]').change(this.updateLocation.bind(this));
    return this;
  },
  updateLocation: function() {
    this.model.set('location', this.$('input[name=location]:checked').val());
  },
  template: _.template($('#location_template').html()),
});

const LeftFrameView = Backbone.View.extend({
  el: '#left-frame',

  initialize: function() {
    this.config_view = new ConfigView();
    this.service_account_view = new ServiceAccountView();
    this.location_view = new LocationView();
    this.search_image_view = new SearchImageConfigView();
    this.render();
  },

  hideSearch: function() {
    this.search_image_view.$el.hide();
  },

  showSearch: function() {
    this.search_image_view.$el.show();
  },

  render: function() {
    this.$el.append(this.config_view.render().$el);
    this.$el.append(this.service_account_view.render().$el);
    this.$el.append(this.location_view.render().$el);
    this.$el.append(this.search_image_view.render().$el);
    this.hideSearch();
    return this;
  }
});

const OperationStatusModel = Backbone.Model.extend({
  defaults: {
    'operation_id': '',
    'error': '',
    'response': null,
    'url': '',
  },

  config_model: exp.CONFIG_MODEL,

  isValid: function() {
    function is_valid_operation(val) {
      return /^locations[/][a-z1-9-]+[/]operations[/][^/]+$/.test(val);
    }
    return is_valid_operation(this.get('operation_id'));
  },
  hasError: function() {
    const response = this.get('response');
    return !response.success || response.response.error;
  },
  getResult: function() {
    var response = this.get('response');
    if (response.success) {
      response = response.response;
    }
    return response;
  },
  checkStatus: function() {
    this.set('error', '');
    const error_msg = this.config_model.error();
    if (error_msg) {
      this.set('error', error_msg);
      return;
    }
    const operation_url = this.config_model.getEndpointNoVersion() + '/v1/' +
        this.get('operation_id');
    console.log(operation_url);
    this.set('url', operation_url);
    $.ajax({
       url: '/getOperation',
       type: 'POST',
       data: JSON.stringify({
         operation_url: operation_url,
         key: this.config_model.get('key'),
       }),
       cache: false,
       contentType: 'application/json',
       dataType: 'json',
     }).done(function(response) {
      this.set('response', response);
    }.bind(this));
  },
});


const SearchOperationStatusView = Backbone.View.extend({
  initialize: function() {
    this.model = new OperationStatusModel();
  },

  render: function() {
    this.$el.html(this.template());
    this.$('#operation-id')
        .on('change input paste', this.updateOperationId.bind(this));
    this.$('#operation-button').click(this.model.checkStatus.bind(this.model));
    this.model.on(
        {
          'change:error': this.showError,
          'change:response': this.showResponse,
        },
        this);
    return this;
  },
  showError: function() {
    const template =
        _.template('<div class="notification"><%= error %></div>')({
          error: this.model.get('error'),
        });
    this.$('#show-operation').html(template);
  },
  showResponse: function() {
    function template(json_obj, url) {
      const template = _.template(
          '<p>GET <%= url %></p><pre class="text-left"> <%= json %> </pre>')({
        url: url,
        json: JSON.stringify(json_obj, undefined, 2),
      });
      return template;
    }
    console.log(this.model.get('url'));
    this.$('#show-operation')
        .html(template(
            this.model.getResult(),
            this.model.get('url'),
            ));
    if (this.model.hasError()) {
      this.$('#show-operation pre').addClass('error');
    }
  },
  updateOperationId: function(e) {
    const id = $(e.target).val();
    this.model.set('operation_id', id);
    if (this.model.isValid()) {
      this.$('#operation-button').removeAttr('disabled');
    } else {
      this.$('#operation-button').attr('disabled', true);
    }
    if (!id) {
      this.$('#show-operation').empty();
    }
  },
  template: _.template($('#operation_status_search_template').html()),
});


const CsvQueryModel = Backbone.Model.extend({
  defaults: {
    'gcs_csv': '',
    'error': '',
    'response': null,
    'url_for_import': '',
    'operation_id': '',
    'stop': false,
  },

  config_model: exp.CONFIG_MODEL,

  getOperationUrl: function() {
    if (!this.get('operation_id')) {
      return '';
    }
    return this.config_model.getEndpointNoVersion() + '/v1/' +
        this.get('operation_id');
  },

  beginImport: function() {
    return this.get('url_for_import').length > 0;
  },

  importCsv: function() {
    this.set('error', '');
    const error = this.config_model.error();
    if (error) {
      this.set('error', error);
      return;
    }

    const url_for_import = this.config_model.get('endpoint') + '/projects/' +
        this.config_model.get('project_id') + '/locations/' +
        this.config_model.get('location') + '/productSets:import';
    this.set('url_for_import', url_for_import);

    const gcs_uri = this.get('gcs_csv');
    const key = this.config_model.get('key');
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
      const result = response.response;
      if (result && result.name) {
        this.set('operation_id', result.name);
        this.checkStatus();
      } else {
        this.set('response', response);
      }
    }.bind(this));
  },

  checkStatus: function() {
    if (this.get('stop') || !this.getOperationUrl()) {
      return;
    }
    $.ajax({
       url: '/getOperation',
       type: 'POST',
       data: JSON.stringify({
         operation_url: this.getOperationUrl(),
         key: this.config_model.get('key'),
       }),
       cache: false,
       contentType: 'application/json',
       dataType: 'json',
     }).done(function(response) {
      const result = response.response;
      if (!response.success || !result) {
        console.log(response);
        this.set('response', response);
      } else {
        if (result.done) {
          this.set('response', response);
        } else {
          setTimeout(function() {
            this.checkStatus();
          }.bind(this), 5 * 1000);
        }
      }
    }.bind(this));
  },
});


function showPreInDom(show_dom, json_obj, text) {
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

const CsvInputView = Backbone.View.extend({
  initialize: function() {
    this.model = new CsvQueryModel();
  },
  showError: function() {
    const error = this.model.get('error');
    if (error) {
      this.$('.result').html('<div class="notification">' + error + '</div>');
    } else {
      this.$('.result').empty();
    }
  },
  showResponse: function() {
    const response = this.model.get('response');
    showPreInDom(
        this.$('.operation_status'), response.response, 'Operation FINISHED!');
  },
  showOperationId: function() {
    const operation_id = this.model.get('operation_id');
    const copy_dom = new CopyDomClass(operation_id, 'Copy operation id');
    this.$('.result').empty();
    this.$('.result')
        .append(copy_dom.dom())
        .append($('<span>').append(operation_id));
  },
  render: function(parent) {
    this.$el.html(this.template());
    this.$('.add').click(function() {
      this.$el.before(new CsvInputView().render(parent).$el);
    }.bind(this));
    this.$('.remove').click(function() {
      if (parent.size() > 1) {
        this.$el.remove();
      }
    }.bind(this));
    this.$('input[name="input"]').on('change input paste', function(e) {
      if (/^gs:[//][\^/].+[/].+$/.test($(e.target).val())) {
        this.$('.import').removeAttr('disabled');
        this.model.set('gcs_csv', $(e.target).val());
      } else {
        this.$('.import').attr('disabled', true);
      }
    }.bind(this));
    this.$('.import').click(function() {
      this.model.importCsv();
      if (this.model.beginImport()) {
        this.$('.import').attr('disabled', true);
        const img = $('<img>').attr('src', '/static/spinner-white.gif');
        img.width(80).height(80);
        this.$('.operation_status').html(img);
      }
    }.bind(this));
    this.model.on(
        {
          'change:error': this.showError,
          'change:response': this.showResponse,
          'change:operation_id': this.showOperationId
        },
        this);

    return this;
  },
  template: _.template($('#csv_input_template').html()),
});

const IndexCsvView = Backbone.View.extend({
  initialize: function() {
    this.template = $('#index-image-section-hidden').clone().show();
    this.template.attr('id', 'index-image-section');
  },

  size: function() {
    return this.$('#csv').children().length;
  },

  render: function() {
    this.$el.html(this.template);
    this.$('.toggle').click(function(e) {
      const target = $(e.target).attr('toggle_target');
      const dom = $(target)[0];
      if (dom.style.display == 'none') {
        dom.style.display = '';
      } else {
        dom.style.display = 'none';
      }
    });
    this.$('#csv').append(new CsvInputView().render(this).$el);
    return this;
  }
});

const SearchImageConfigView = Backbone.View.extend({
  className: 'search-image-config',
  initialize: function() {
    this.canvas_view = exp.canvas_view;
    this.model = exp.search_image_model;
  },
  render: function() {
    this.$el.html(this.template());
    this.$('input[name="category"]').change(function(e) {
      this.$('#product-category').val($(e.target).val()).change();
    }.bind(this));
    this.$('#product-category').change(function(e) {
      this.model.set('product_category', $(e.target).val());
    }.bind(this));
    this.$('#product-set-name').change(function(e) {
      this.model.set('product_set_id', $(e.target).val());
    }.bind(this));
    this.$('#upload-image').change(this.renderImage.bind(this));
    this.$('#max-items').change(function(e) {
      this.model.set('max_items', $(e.target).val());
    }.bind(this));
    return this;
  },
  showMessage: function(m) {
    console.log(m);
  },
  renderImage: function(e) {
    const dom = e.target;
    if (dom.files && dom.files[0]) {
      this.model.set('image_blob', dom.files[0]);
      const mimeType = dom.files[0]['type'];
      if (mimeType.split('/')[0] !== 'image') {
        this.showMessage('The selected file is not an image...');
        return;
      }
      let reader = new FileReader();
      reader.onload = function(e) {
        IMAGE_UPLOADED = new Image();
        IMAGE_UPLOADED.src = e.target.result;
        IMAGE_UPLOADED.onload = function() {
          this.canvas_view.renderImageToCanvas(IMAGE_UPLOADED);
        }.bind(this);
        // this.toggleSubmitButton();
      }.bind(this);
      reader.readAsDataURL(dom.files[0]);
    }
  },
  template: _.template($('#image-search-config-hidden').clone().html()),
});


const DisplaySearchResultView = Backbone.View.extend({
  initialize: function() {
    this.right_container = $('#right-container');
    this.bottom_container = $('#bottom-container');
    this.info_container = $('#canvas-notice');
    this.model = exp.search_image_model;
    this.model.on('change:num_matches', this.renderMatchTable, this);
    this.model.on('change:error', this.showError, this);
  },
  render: function() {
    return this;
  },
  showError: function() {
    this.info_container.html(
        _.template('<div class="notification"><%= html %></div>')({
          html: this.model.get('error'),
        }));
  },
  getSpinnerUrl: function() {
    return '/static/spinner-white.gif';
  },

  composeOneDivForImage: function(result, index) {
    // Create cell element.
    const div_one_image =
        $('<div>').attr('id', 'match' + index).addClass('one-image');
    const a = $('<a>')
                  .attr('id', 'anchor' + index)
                  .attr('href', this.getSpinnerUrl())
                  .addClass('matched');
    const img = $('<img>')
                    .attr('src', this.getSpinnerUrl())
                    .attr('id', 'image' + index);
    img.attr('width', 150).attr('height', 150);
    a.append(img);
    div_one_image.append(a);

    // Create metadata display.
    const label = $('<div>').attr('name', 'label').addClass('metadata');
    label.text('Loading...');
    div_one_image.append(label);
    const dataset =
        $('<div>').attr('id', 'dataset' + index).addClass('metadata');

    if (result.product.productLabels) {
      for (const kv of result.product.productLabels) {
        if (kv.key === 'dataset') {
          dataset.text('Dataset: ' + kv.value);
        }
      }
    }
    div_one_image.append(dataset);

    // The score could be missing, but add it if it's there.
    if (result.score) {
      const score = $('<div>').attr('id', 'score' + index).addClass('metadata');
      score.text('Score: ' + result.score);
      div_one_image.append(score);
    }
    return div_one_image;
  },
  renderImage: function(index, div) {
    const response = this.model.get('image-' + index);
    if (!response) {
      div.empty();
      return;
    }
    const label = div.find('div[name="label"]');
    const image = div.find('img');
    const anchor = div.find('a');
    if (!response.success) {
      const errorUrl =
          'https://storage.googleapis.com/dolphin-static/error.png';
      image.attr('src', errorUrl);
      label.html(response.error);
      console.log(response);
      return;
    }

    let new_image = new Image();
    new_image.src = response.image_url;
    new_image.onload = function() {
      const width = new_image.width;
      const height = new_image.height;
      const scale = 150 / width;
      new_image.width = width * scale;
      new_image.height = height * scale;
      image.replaceWith(new_image);
    };
    anchor.attr('href', response.image_url);
    label.html('#' + (index + 1) + ': ' + response.label);
  },
  renderMatchTable: function() {
    const num_matches = this.model.get('num_matches');
    $('.one-image').remove();
    if (this.model.get('index_time')) {
      this.info_container.html(
          _.template('<div class="index-time"><%= html %></div>')({
            html: this.model.get('index_time'),
          }))
    }
    for (let i = 0; i < num_matches; i++) {
      const result = this.model.get('results')[i];
      const div = this.composeOneDivForImage(result, i);
      const dom = i >= 6 ? this.bottom_container : this.right_container;
      dom.append(div);
      this.model.on('change:image-' + i, function() {
        this.renderImage(i, div);
      }.bind(this), this);
    }
  },
});

function doubleBindValue(dom, model, key) {
  dom.change(function(e) {
    model.set(key, $(e.target).val());
  });
  model.on('change:' + key, function() {
    dom.val(model.get(key));
  });
}
exp.doubleBindValue = doubleBindValue;

const CanvasView = Backbone.View.extend({
  initialize: function() {
    this.model = exp.search_image_model;
  },
  render: function() {
    this.$el.html(this.template({
      right: 'right-container',
      bottom: 'bottom-container',
    }));
    this.$('a').click(function() {
      this.model.search();
    }.bind(this));
    doubleBindValue(this.$('#bounding-poly'), this.model, 'bounding_poly');

    return this;
  },
  renderImageToCanvas: function(img) {
    function min(a, b) {
      return a > b ? b : a;
    }
    if (!img) {
      return;
    }
    const canvas = this.$('#canvas');
    canvas.empty();
    const scale = min(
        canvas.attr('width') / img.width, canvas.attr('height') / img.height);
    img.height = img.height * scale;
    img.width = img.width * scale;
    canvas.width(img.width);
    canvas.height(img.height);
    canvas.append(img);
    this.$('#bounding-poly').empty().change();
  },
  template: _.template($('#canvas_template').html()),
});
exp.canvas_view = new CanvasView();

const RightFrameView = Backbone.View.extend({
  el: '#right-frame',

  initialize: function() {
    this.index_csv_view = new IndexCsvView();
    this.show_operation_view = new SearchOperationStatusView();
    this.canvas_view = exp.canvas_view;
    this.render();
  },

  showSearch: function() {
    this.index_csv_view.$el.hide();
    this.show_operation_view.$el.hide();
    this.canvas_view.$el.show();
  },

  showIndex: function() {
    this.index_csv_view.$el.show();
    this.show_operation_view.$el.show();
    this.canvas_view.$el.hide();
  },

  render: function() {
    this.$el.append(this.index_csv_view.render().$el);
    this.$el.append(this.show_operation_view.render().$el);
    this.$el.append(this.canvas_view.render().$el);
    this.search_image_view = new DisplaySearchResultView();
    exp.initDraw('canvas', function(bbox) {
      if (bbox) {
        const bbox_str = JSON.stringify(bbox, function(key, val) {
          return val.toFixed ? Number(val.toFixed(3)) : val;
        });
        exp.search_image_model.set('bounding_poly', bbox_str);
      } else {
        exp.search_image_model.set('bounding_poly', '');
      }
    });
    this.showIndex();
    return this;
  }
});

const left_frame_view = new LeftFrameView();
const right_frame_view = new RightFrameView();
$('#index-nav').click(function() {
  left_frame_view.hideSearch();
  right_frame_view.showIndex();
});
$('#search-nav').click(function() {
  left_frame_view.showSearch();
  right_frame_view.showSearch();
});

$('.div-radio').click(function(e) {
  $(e.target).find('input').click();
});
})();
