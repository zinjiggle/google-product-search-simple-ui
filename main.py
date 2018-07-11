from __future__ import print_function

import datetime
import json
import logging
import os

from flask import Flask, render_template, request, send_from_directory
from google.auth.transport.requests import AuthorizedSession
from google.cloud import storage
from google.oauth2 import service_account

from base64 import b64encode

app = Flask(__name__)

_DEFAULT_URL_EXPIRATION = datetime.timedelta(minutes=30)

_DEFAULT_SCOPES = (
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/cloud-vision',
)


def _Error(message):
  """ Returns a JSON representing an error response. """
  return json.dumps({
      'success': False,
      'error': message,
  })


@app.route('/')
def main():
  return render_template('index.html')


def parse_product_search_request(req):
  image_file = req.files.get('imageBlob', None)
  if not image_file:
    return 'Invalid image.'
  try:
    content = image_file.read()
  except ValueError:
    return 'Invalid image file.'

  try:
    json_key = json.loads(req.form.get('key', None))
  except (ValueError, TypeError):
    return "Invalid json key."

  product_set = req.form.get('productSet', '')
  if not product_set:
    return 'Invalid product set.'

  product_category = req.form.get('category', '')
  if not product_category:
    return 'Invalid product category.'

  endpoint = req.form.get('endpoint', '')
  if not endpoint or not endpoint.startswith('https://'):
    return 'Invalid api endpoint.'

  try:
    max_results = int(req.form.get('size', None))
    if max_results <= 0 or max_results > 500:
      return 'Invalid size.'
  except (ValueError, TypeError):
    return 'Invalid size.'

  product_search_request_json = {
      'requests': [{
          'image': {
              'content': b64encode(content).decode('ascii'),
          },
          'features': [
              {
                  'type': 'PRODUCT_SEARCH',
                  'max_results': max_results,
              }
          ],
          'image_context': {
              'product_search_params': {
                  'product_set': product_set,
                  'product_categories': [product_category],
              },
          },
      }],
  }

  return (json_key, endpoint, product_search_request_json)


@app.route('/productSearch', methods=['POST'])
def product_search():
  result = parse_product_search_request(request)
  if type(result) == type(''):
    return _Error(result)
  try:
    (json_key, endpoint, product_search_request_json) = result
    credentials = service_account.Credentials.from_service_account_info(
        json_key)
    scoped_credentials = credentials.with_scopes(_DEFAULT_SCOPES)
    authed_session = AuthorizedSession(scoped_credentials)
    url = os.path.join(endpoint, 'images:annotate')
    response = authed_session.post(
        url=url, data=json.dumps(product_search_request_json)).json()
  except Exception as e:
    return _Error('Internal error: ' + str(e))
  return json.dumps({
      'success': True,
      'response': response,
  })


@app.route('/getMatchedImage', methods=['POST'])
def get_match_image():
  content = request.get_json()

  if 'name' not in content:
    return _Error('No name found in request')

  if 'key' not in content:
    return _Error('No key found in request')

  if 'endpoint' not in content:
    return _Error('No api endpoint in request')

  image_full_name = content['name']
  endpoint = content['endpoint']
  if not endpoint.startswith('https://'):
    return _Error('Invalid api endpoint')
  product_id = image_full_name.split('/')[5]
  url = os.path.join(endpoint, image_full_name)

  try:
    json_key = json.loads(content['key'])
  except (ValueError, TypeError):
    return _Error('Invalid key found in request')

  try:
    credentials = service_account.Credentials.from_service_account_info(
        json_key)
    scoped_credentials = credentials.with_scopes(_DEFAULT_SCOPES)
    authed_session = AuthorizedSession(scoped_credentials)
    response = authed_session.get(url=url).json()
  except Exception as e:
    return _Error('%r: %r' % (image_full_name, e))

  if 'uri' not in response:
    return _Error('Image not found: %r' % (image_full_name))

  try:
    gcs_client = storage.Client(
        project=json_key['project_id'], credentials=credentials)
    bucket_name, path = parse_gcs_uri(response['uri'])
    blob = gcs_client.bucket(bucket_name).blob(path)
  except Exception as e:
    return _Error(str(e))

  res = json.dumps({
      'success': True,
      'image_url': blob.generate_signed_url(_DEFAULT_URL_EXPIRATION),
      'label': product_id,
  })
  return res


def parse_gcs_uri(uri):
  splitted = uri.split('/')
  if len(splitted) < 4:
    return None, None
  return splitted[2], '/'.join(splitted[3:])


if __name__ == '__main__':
  app.run(host='127.0.0.1', port=8080, debug=True)
