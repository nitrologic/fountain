// worker.ts

try {
	const result = "hello world";
	self.postMessage({ success: true, data: result });
} catch (error) {
	self.postMessage({ success: false, error: error.message });
}
