import sys
import os.path
import glob

if len(sys.argv) < 3:
    # We find the latest log##.tsv and infer the output filename
    tsvList = glob.glob('logs/log*-unconsolidated.tsv')
    if len(tsvList) == 0:
        print "Error: There are no input logs in logs/"
        exit()
    inputFile = max(tsvList, key=os.path.getctime)
    print "Found input file: " + inputFile

    outputFile = inputFile.replace("un", "")
    print "Output file: " + outputFile
else:
    inputFile = sys.argv[1]
    outputFile = sys.argv[2]

with open(inputFile) as tsv:
    lines = tsv.readlines()
# Strip end of newlines, split by tab, and skip header row
lines = [line.rstrip().split("\t") for line in lines][1:]
# Convert to (timestamp, id, value)
lines = [(int(line[0]), line[1], line[2] if len(line) >= 3 else "") for line in lines]

ids = []
for line in lines:
    if not (line[1] in ids):
        ids += [line[1]]

output = []
currentTimestamp = None
for line in lines:
    if line[0] != currentTimestamp:
        # Add blank output line with new timestamp
        outputLine = { "timestamp": line[0] }
        for id in ids:
            outputLine[id] = ""
        output += [outputLine]
        currentTimestamp = line[0]
    # Fill in current output line
    output[-1][line[1]] = line[2]
# Convert back to CSV
output = [str(line["timestamp"]) + "\t" + "\t".join([line[id] for id in ids]) + "\r\n" for line in output]
# Add header
output = ["timestamp\t" + "\t".join(ids) + "\r\n"] + output

with open(outputFile, "w") as tsv:
    tsv.writelines(output)