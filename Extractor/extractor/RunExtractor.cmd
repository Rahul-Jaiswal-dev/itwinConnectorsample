echo off

SET ARG=%1

IF NOT DEFINED ARG goto usage

IF %ARG%==--clean goto clean
IF %ARG%==--all goto all
IF %ARG%==--copy goto copyToConnector
goto usage

:all
	IF NOT DEFINED pythonCmd Set pythonCmd=python.exe
	echo extracting all
	IF NOT EXIST output mkdir output
	%pythonCmd% extractor.py input/samplesheet.xlsx output/samplesheet.db # create
	%pythonCmd% extractor.py input/SampleSheetV2.xlsx output/intermediary_v2.db # data change
	%pythonCmd% extractor.py input/SampleSheetV3.xlsx output/intermediary_v3.db # schema change (addition)
	%pythonCmd% extractor.py input/SampleSheetV4.xlsx output/intermediary_v4.db # schema change (deletion)

goto end

:clean
	echo cleaning
	rmdir /s /q output
	del ..\..\Connector\src\assets\*.db
	del ..\..\Connector\src\test\assets\*.db
	del ..\..\Connector\src\test\output\*.db


goto end

:copyToConnector
echo copying databases from extractor output to connector assets
IF NOT EXIST ..\..\Connector\src\assets mkdir ..\..\Connector\src\assets
IF NOT EXIST ..\..\Connector\src\output mkdir ..\..\Connector\src\output
IF NOT EXIST ..\..\Connector\src\test\assets mkdir ..\..\Connector\src\test\assets
IF NOT EXIST ..\..\Connector\src\test\output mkdir ..\..\Connector\src\test\output
copy .\output\*.db  ..\..\Connector\src\assets\
copy .\output\*.db  ..\..\Connector\src\test\assets\
goto end

:usage
	echo RunExtractor usage
	echo -----------------------------
	echo RunExtractor "<option>"
	echo e.g. RunExtractor --all
	echo options:
	echo --all - extracts all sample sheets
	echo --clean - removes output from previous extractions
	echo --copy - copies databases from extractor output to connector assets
:end
	echo runextractor completed! 