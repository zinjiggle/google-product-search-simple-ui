This is a simple UI interface to call Google product search API.

To start the app in python virtual environment:
+ virtualenv --python python3 env
+ source env/bin/activate
+ pip install -r requirements.txt
+ python main.py
  
To deploy the app on [Google App Engine](https://cloud.google.com/appengine/docs/standard/python/getting-started/deploying-the-application):
+ gcloud app deploy --project "your-project-id"
