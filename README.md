# iTwin Connector

iTwin connector enables a wide range of both Bentley and third-party design applications to contribute data to an iTwin.

## Steps to run iTwin Connector

### Install dependencies for running Extractor (First time only)

#### Instructions

1. Requires Python 3 (e.g. 3.9.1) [Python Downloads](https://www.python.org/downloads/)

2. Go to Extractor root folder <PATH_TO_PROJECT_ROOT_FOLDER/Extractor>

3. Run following command using Command Prompt from Extractor root folder to install dependencies.

```sh

   pip install -r requirements.txt

```


### Add Device data in Excel format

Enter device data in [Excel format](https://github.com/Rahul-Jaiswal-dev/itwinConnectorsample/edit/master/Extractor/extractor/input).

There is already sample data provided in Excel file. Modify this particular file <PATH_TO_PROJECT_ROOT_FOLDER/Extractor/extractor/input/samplesheet.xlsx> to change the data.

### Run Connector

A. Go to Connector root folder <PATH_TO_PROJECT_ROOT_FOLDER/Connector> and create an .env file with the following content.

```sh

###############################################################################
# This file contains secrets - don't commit or share it!
###############################################################################

IMJS_CONTEXT_ID = <CONTEXT_ID>

IMJS_IMODEL_ID = <IMODEL_ID>

# Excel file resides at <PATH_TO_PROJECT_ROOT_FOLDER/Extractor/extractor/input/samplesheet.xlsx>
IMJS_DATA_SOURCE = samplesheet.xlsx

IMJS_CLIENT_ID = <CLIENT_ID>

IMJS_REDIRECT_URI = http://localhost:3000/signin-callback

IMJS_SCOPE = openid email profile organization imodelhub context-registry-service:read-only product-settings-service projectwise-share urlps-third-party

```

B. Run the following script from Connector root folder <PATH_TO_PROJECT_ROOT_FOLDER/Connector> using Command Prompt.

```sh

1. npm install

2. npm run start

```

## Limitations

All devices should have a unique DeviceId.
