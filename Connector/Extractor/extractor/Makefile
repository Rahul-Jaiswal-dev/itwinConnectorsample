all:
	python3 extractor.py input/SampleSheetV1.xlsx output/intermediary_v1.db # create
	python3 extractor.py input/SampleSheetV2.xlsx output/intermediary_v2.db # data change
	python3 extractor.py input/SampleSheetV3.xlsx output/intermediary_v3.db # schema change (addition)
	python3 extractor.py input/SampleSheetV4.xlsx output/intermediary_v4.db # schema change (deletion)

clean: 
	rm output/*


