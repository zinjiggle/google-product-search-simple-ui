/*eslint-env jquery */
/*globals idToken */
let IMAGE_UPLOADED = null;
let JSON_KEY_TEXT = null;

// DOM elements to be manipulated.
let $submitButton;
let $messageBox;
let $MATCHEDIMAGESDIV;

// Some constants.
const errorUrl = 'https://storage.googleapis.com/dolphin-static/error.png';
const spinnerUrl = 'https://storage.googleapis.com/dolphin-static/spinner.gif';
const matchedImageHeight = 150;
const matchedImageWidth = 150;

// Init on page load.
$(document).ready(function() {
  console.log('Initializing...');
  $submitButton = $('#submit');
  $messageBox = $('#message');
  $MATCHEDIMAGESDIV = $('#matched');
});

function enableSubmitButton() {
  if ($submitButton) {
    $submitButton.removeAttr('disabled');
  }
}

function disableSubmitButton() {
  if ($submitButton) {
    $submitButton.attr('disabled', 'disabled');
  }
}

function toggleSubmitButton() {
  if (JSON_KEY_TEXT && IMAGE_UPLOADED && $('#productSet').val() &&
      $('#productCategory').val() && $('#maxItems').val() &&
      $('#apiEndpoint').val()) {
    enableSubmitButton();
  } else {
    disableSubmitButton();
  }
}

function getSpinnerUrl() {
  return spinnerUrl + '?v=' + Math.random();
}

// Process the input form.
function processUploadForm() {
  if (!JSON_KEY_TEXT) {
    showMessage('Invalid json key.')
    return false;
  }
  var imageBlob = document.getElementById('uploadInput').files[0];
  if (!imageBlob) {
    showMessage('Invalid image file for searching.');
    return false;
  }
  const productSet = $('#productSet').val();
  if (!productSet) {
    showMessage('Invalid product set path.');
    return false;
  }
  productCategory = $('#productCategory').val();
  if (!productCategory) {
    showMessage('Invalid product category. Can be homegoods or apparel.');
    return false;
  }

  const maxItems = Number($('#maxItems').val());
  if (maxItems <= 0 || maxItems > 200) {
    showMessage('Max items should be between 1 and 200.');
    return false;
  }

  const apiEndpoint = $('#apiEndpoint').val();
  if (!apiEndpoint) {
    showMessage('Invalid api endpoint.');
    return false;
  }

  const boundingPoly = $('#boundingPoly').val();

  var fd = new FormData();
  fd.append('key', JSON_KEY_TEXT);
  fd.append('imageBlob', imageBlob);
  fd.append('productSet', productSet);
  fd.append('category', productCategory);
  fd.append('endpoint', apiEndpoint);
  fd.append('size', maxItems);
  fd.append('boundingPoly', boundingPoly);

  $.ajax({
     type: 'POST',
     url: 'productSearch',
     data: fd,
     processData: false,
     contentType: false,
   }).done(function(data) {
    const json_data = JSON.parse(data);
    if (json_data.hasOwnProperty('error')) {
      showMessage(json_data['error']);
    } else if (json_data['response'].hasOwnProperty('error')) {
      showMessage(JSON.stringify(json_data['response']['error']));
    } else {
      processResponse(json_data['response']);
    }
  });
  showMessage('Processing...');
  return false;
}

function IsJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

function uploadJsonKey(input) {
  if (input.files && input.files[0]) {
    let reader = new FileReader();
    reader.onload = function(e) {
      let result = e.target.result;
      if (!IsJsonString(result)) {
        showMessage('The selected file is not a text json...');
        JSON_KEY_TEXT = null;
      } else {
        showMessage('Valid json file.');
        JSON_KEY_TEXT = result;
      }
      toggleSubmitButton()
    };
    reader.readAsText(input.files[0]);
  }
}

function renderImage(form) {
  if (form.files && form.files[0]) {
    const mimeType = form.files[0]['type'];
    if (mimeType.split('/')[0] !== 'image') {
      showMessage('The selected file is not an image...');
      return;
    }

    let reader = new FileReader();
    reader.onload = function(e) {
      IMAGE_UPLOADED = new Image();
      IMAGE_UPLOADED.src = e.target.result;
      IMAGE_UPLOADED.onload = function() {
        renderImageToCanvas(IMAGE_UPLOADED);
      };
      toggleSubmitButton();
    };
    reader.readAsDataURL(form.files[0]);
    $('#boundingPoly').val('');
  }
}

function min(a, b) {
  if (a > b) {
    return b;
  }
  return a;
}

function renderImageToCanvas(img) {
  if (!img) {
    return;
  }
  const canvas = $('#canvas');
  canvas.empty();
  const scale =
      min(canvas.attr('width') / img.width, canvas.attr('height') / img.height);
  img.height = img.height * scale;
  img.width = img.width * scale;
  canvas.width(img.width);
  canvas.height(img.height);
  canvas.append(img);
  showMessage('Image is valid. Click to find similar dolphins.');
}

function renderMatchTable(numMatches, results) {
  if (numMatches === 0) {
    return;
  }

  $MATCHEDIMAGESDIV.empty();
  for (let i = 0; i < numMatches; i++) {
    const result = results[i];
    // Create cell element.
    const div_one_image = $('<div>').attr('id', 'match' + i).addClass('left');

    // Create preview image element.
    const a = $('<a>')
                  .attr('id', 'anchor' + i)
                  .attr('href', getSpinnerUrl())
                  .addClass('matched');
    const img = $('<img>').attr('src', getSpinnerUrl()).attr('id', 'image' + i);
    img.attr('width', matchedImageWidth).attr('height', matchedImageHeight);
    a.append(img);
    div_one_image.append(a);

    // Create metadata display.
    const label = $('<div>').attr('id', 'label' + i).addClass('metadata');
    label.text('Loading...');
    div_one_image.append(label);
    const dataset = $('<div>').attr('id', 'dataset' + i).addClass('metadata');

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
      const score = $('<div>').attr('id', 'score' + i).addClass('metadata');
      score.text('Score: ' + result.score);
      div_one_image.append(score);
    }

    // Add to the row.
    $MATCHEDIMAGESDIV.append(div_one_image);
  }
}

function processResponse(response) {
  if (!response.responses) {
    showMessage('No matches found!');
    return;
  }

  for (const singleResponse of response.responses) {
    if (singleResponse.error) {
      showMessage(singleResponse.error.message);
      return;
    }
    const numMatches = singleResponse.productSearchResults.results.length;

    if (numMatches === 0) {
      showMessage('No matches found from productSearchResults!');
      return;
    }

    showMessage(
        'Product set index time: ' +
        singleResponse.productSearchResults.indexTime);

    renderMatchTable(numMatches, singleResponse.productSearchResults.results);

    for (let i = 0; i < numMatches; i++) {
      getImage(singleResponse.productSearchResults.results[i], i);
    }
  }
}

function getImage(result, index) {
  let fullName = result.image;

  $.ajax({
     url: '/getMatchedImage',
     type: 'POST',
     data: JSON.stringify({
       name: fullName,
       index: index,
       key: JSON_KEY_TEXT,
       endpoint: $('#apiEndpoint').val(),
     }),
     cache: false,
     contentType: 'application/json',
     dataType: 'json',
   }).done(function(response) {
    processGetImageResponse(response, index);
  });
}

function processGetImageResponse(response, index) {
  const label = $('#label' + index);
  const image = $('#image' + index);
  const anchor = $('#anchor' + index);
  if (!response.success) {
    image.attr('src', errorUrl);
    label.html(response.error);
    return;
  }

  let new_image = new Image();
  new_image.src = response.image_url;
  new_image.id = image.attr('id');
  new_image.onload = function() {
    const width = new_image.width;
    const height = new_image.height;
    const scale = matchedImageWidth / width;
    new_image.width = width * scale;
    new_image.height = height * scale;
    image.replaceWith(new_image);
  };
  anchor.attr('href', response.image_url);
  label.html('#' + (index + 1) + ': ' + response.label);
}

function showMessage(message) {
  let finalMessage = message;
  console.log(finalMessage);
  $messageBox.html(finalMessage);
}
