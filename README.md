# iTwin Connector

iTwin connectors enables a wide range of both Bentley and third-party design applications to contribute to an iTwin.

## Steps to run Connector

### A.Run Extractor to install dependencies(First time only)

#### Instructions

```sh

1. Requires Python 3 (e.g. 3.9.1) [Python Downloads](https://www.python.org/downloads/)
2. run "pip install -r requirements.txt" to install dependencies

```

### B.Run Connector

A. Create a .env file at the project root with the following:

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

B. Follow this step now in Connector Code

1. npm run start
