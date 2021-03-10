# iTwin Connector

iTwin connector enables a wide range of both Bentley and third-party design applications to contribute data to an iTwin.

## Steps to run Connector

### Install dependencies for running Extractor (First time only)

#### Instructions

```sh

1. Requires Python 3 (e.g. 3.9.1) [Python Downloads](https://www.python.org/downloads/)
2. Run "pip install -r requirements.txt" from Extractor root folder to install dependencies
3. Enter device data in [Excel format](./Extractor/extractor/input/samplesheet.xlsx).

```

### Run Connector

A. Create an .env file at the project root with the following content:

```sh

###############################################################################
# This file contains secrets - don't commit or share it!
###############################################################################

projectId = ""

projectName = ""

iModelName = ""

intermediaryDb = ""

clientId = ""

redirectUri = ""

scope = "openid email profile organization imodelhub context-registry-service:read-only product-settings-service projectwise-share urlps-third-party"

```

B. Run the following script from Connector root folder

```sh

npm run start

```

## Limitations

All devices should have a unique DeviceId.
