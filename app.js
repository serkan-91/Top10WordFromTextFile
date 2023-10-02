var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs/promises');
const importPath = 'C:\\Users\\Serkan\\Desktop\\TheWordWithTheMostExample2\\output.txt';
const numCPUs = require('os').cpus().length;
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function getFileSize(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const stats = yield fs.stat(filePath);
        return stats.size;
    });
}
function readChunk(filePath, position, size) {
    return __awaiter(this, void 0, void 0, function* () {
        const fileDescriptor = yield fs.open(filePath, 'r');
        const buffer = Buffer.alloc(size);
        try {
            const { bytesRead } = yield fileDescriptor.read(buffer, 0, size, position);
            return buffer.toString('utf-8', 0, bytesRead);
        }
        finally {
            yield fileDescriptor.close();
        }
    });
}
function processChunk(chunk) {
    const words = chunk.split("\n");
    const wordCounts = {};
    words.forEach(word => {
        const clearword = word.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
        if (clearword !== '') {
            if (wordCounts[clearword]) {
                wordCounts[clearword]++;
            }
            else {
                wordCounts[clearword] = 1;
            }
        }
    });
    const repeatWords = Object.keys(wordCounts).filter(word => wordCounts[word] > 1);
    return { repeatWords, wordCounts };
}
let workersCompleted = 0;
let totalWordCounts = {};
const startTime = new Date();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        if (isMainThread) {
            console.log(`Main thread started: ${startTime.toISOString()}`);
            const fileSize = yield getFileSize(importPath);
            const workerDataArray = [];
            for (let i = 0; i < numCPUs; i++) {
                const start = i * (fileSize / numCPUs);
                const end = (i + 1) * (fileSize / numCPUs);
                workerDataArray.push({ importFile: importPath, start, end });
            }
            const workers = workerDataArray.map(data => new Worker(__filename, { workerData: data }));
            for (const worker of workers) {
                worker.on('message', (data) => {
                    const { repeatWords, wordCounts } = data;
                    repeatWords.forEach(word => {
                        if (totalWordCounts[word]) {
                            totalWordCounts[word] += wordCounts[word];
                        }
                        else {
                            totalWordCounts[word] = wordCounts[word];
                        }
                        console.log(`Found word: ${word} = ${totalWordCounts[word]}`);
                    });
                });
                worker.on('error', error => {
                    console.error(`Main thread: Worker thread error: ${error.message}`);
                });
                worker.on('exit', () => {
                    workersCompleted++;
                    if (workersCompleted === numCPUs) {
                        // When all worker threads are completed
                        const sortedWords = Object.keys(totalWordCounts).sort((a, b) => totalWordCounts[b] - totalWordCounts[a]);
                        const top10Words = sortedWords.slice(0, 10);
                        console.log('Top 10 Most Frequently Occurring Words:');
                        top10Words.forEach((word, index) => {
                            console.log(`${index + 1}. ${word}: ${totalWordCounts[word]} times`);
                        });
                        const endTime = new Date();
                        console.log(`Main thread finished: ${endTime.toISOString()}`);
                        const timeDifference = endTime.getTime() - startTime.getTime();
                        const seconds = Math.floor(timeDifference / 1000);
                        const minutes = Math.floor(seconds / 60);
                        const hours = Math.floor(minutes / 60);
                        const remainingMinutes = minutes % 60;
                        const remainingSeconds = seconds % 60;
                        console.log(`Total time: ${hours} hours, ${remainingMinutes} minutes, ${remainingSeconds} seconds`);
                    }
                });
            }
        }
        else {
            const { importFile, start, end } = workerData || {};
            if (importFile) {
                const chunk = yield readChunk(importFile, start, end - start);
                const result = processChunk(chunk);
                parentPort.postMessage(result);
            }
            else {
                console.error('workerData does not contain importFile.');
            }
        }
    });
}
main();
//# sourceMappingURL=app.js.map