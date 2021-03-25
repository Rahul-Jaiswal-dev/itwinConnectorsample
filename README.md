# iTwin Connector

iTwin connector enables a wide range of both Bentley and third-party design applications to contribute data to an iTwin.

## Steps to run iTwin Connector

### Install dependencies for running Extractor (First time only)

#### Instructions

1. Requires Python 3 (e.g. 3.9.1) [Python Downloads](https://www.python.org/downloads/)

2. Go to Extractor root folder <PATH_TO_PROJECT_ROOT_FOLDER/Connector/Extractor>

3. Run following command using Command Prompt from Extractor root folder to install dependencies.

```sh

   pip install -r requirements.txt

```


### Add Device data in Excel format

Enter device data in Excel format.

There is already sample data provided in Excel file. Modify this particular file <PATH_TO_PROJECT_ROOT_FOLDER/input/samplesheet.xlsx> to change the data.

### Run Connector

A. In the Project root folder <PATH_TO_PROJECT_ROOT_FOLDER> and create an .env file with the following content.

```sh

###############################################################################
# This file contains secrets - don't commit or share it!
###############################################################################

IMJS_CONTEXT_ID = <CONTEXT_ID>

IMJS_IMODEL_ID = <IMODEL_ID>

# Excel file resides at <PATH_TO_PROJECT_ROOT_FOLDER/input/samplesheet.xlsx>
IMJS_DATA_SOURCE = samplesheet.xlsx

IMJS_CLIENT_ID = imodeljs-electron-test

IMJS_REDIRECT_URI = http://localhost:3000/signin-callback

IMJS_SCOPE = openid email profile organization imodelhub context-registry-service:read-only product-settings-service projectwise-share urlps-third-party

```

B. Run the following script from Project root folder <PATH_TO_PROJECT_ROOT_FOLDER> using Command Prompt.

```sh

1. npm install

2. npm run start

```

## Limitations

All devices should have a unique DeviceId.
