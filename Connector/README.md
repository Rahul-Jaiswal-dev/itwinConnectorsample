# Steps to run Connector

A. First run Extractor to generate intermediary .db files.(Follow Readme in Extractor).

B. Create a .env file at the project root with the following:

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

C. Follow these steps now in Connector Code

1. npm install
2. npm run build
3. npm run start -- --output=filename (The iModel will be created in lib/output directory).

# Steps to run Connector tests

npm run test:unit
