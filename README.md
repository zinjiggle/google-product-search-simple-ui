This is a simple UI interface to call [Google product search API](https://cloud.google.com/vision/product-search/docs/)

It helps user to index and search images.

Sample site: https://media-demo-service.appspot.com/ 

*Note*: the sample site above supports only alpha & beta version of Product Search. For the latest stable version please deploy your web ui from this repo's source code.

Video tutorial: https://youtu.be/BOdUYTO1jJY

To start the app in python virtual environment:
+ virtualenv --python python3 env
+ source env/bin/activate
+ pip install -r requirements.txt
+ python main.py
  
To deploy the app on [Google App Engine](https://cloud.google.com/appengine/docs/standard/python/getting-started/deploying-the-application):
+ gcloud app deploy --project "your-project-id"
