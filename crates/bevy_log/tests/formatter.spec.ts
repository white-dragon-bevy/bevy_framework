/// <reference types="@rbxts/testez/globals" />

import { LogLevel } from "../src/level";
import { createLogRecord } from "../src/record";
import {
	SimpleFormatter,
	ColorFormatter,
	JsonFormatter,
	CompactFormatter,
	CustomFormatter,
} from "../src/formatter";

export = () => {
	describe("SimpleFormatter", () => {
		it("should format with all options enabled", () => {
			const formatter = new SimpleFormatter({
				showTimestamp: true,
				showLevel: true,
				showTarget: true,
				showLocation: false,
				showMetadata: true,
			});

			const record = createLogRecord(
				LogLevel.Info,
				"Test message",
				"test.module",
				{ key: "value" },
			);

			const formatted = formatter.format(record);
			expect(formatted).to.be.a("string");
			expect(formatted).to.include("[INFO]");
			expect(formatted).to.include("[test.module]");
			expect(formatted).to.include("Test message");
		});

		it("should format with minimal options", () => {
			const formatter = new SimpleFormatter({
				showTimestamp: false,
				showLevel: false,
				showTarget: false,
				showLocation: false,
				showMetadata: false,
			});

			const record = createLogRecord(LogLevel.Info, "Test message", "test");
			const formatted = formatter.format(record);
			expect(formatted).to.equal("Test message");
		});
	});

	describe("CompactFormatter", () => {
		it("should format compactly", () => {
			const formatter = new CompactFormatter();

			const record = createLogRecord(LogLevel.Error, "Error occurred", "test");
			const formatted = formatter.format(record);
			expect(formatted).to.equal("E Error occurred");
		});

		it("should use first letter of level", () => {
			const formatter = new CompactFormatter();

			expect(formatter.format(createLogRecord(LogLevel.Trace, "msg", "t"))).to.equal("T msg");
			expect(formatter.format(createLogRecord(LogLevel.Debug, "msg", "t"))).to.equal("D msg");
			expect(formatter.format(createLogRecord(LogLevel.Info, "msg", "t"))).to.equal("I msg");
			expect(formatter.format(createLogRecord(LogLevel.Warn, "msg", "t"))).to.equal("W msg");
			expect(formatter.format(createLogRecord(LogLevel.Error, "msg", "t"))).to.equal("E msg");
		});
	});

	describe("JsonFormatter", () => {
		it("should format as JSON", () => {
			const formatter = new JsonFormatter(false);
			const record = createLogRecord(
				LogLevel.Warn,
				"Warning message",
				"app.module",
				{ userId: 123, action: "login" },
			);

			const formatted = formatter.format(record);
			const HttpService = game.GetService("HttpService");
			const parsed = HttpService.JSONDecode(formatted) as any;

			expect(parsed.level).to.equal("WARN");
			expect(parsed.message).to.equal("Warning message");
			expect(parsed.target).to.equal("app.module");
			expect(parsed.userId).to.equal(123);
			expect(parsed.action).to.equal("login");
		});
	});

	describe("CustomFormatter", () => {
		it("should format with custom template", () => {
			const formatter = new CustomFormatter("{level} | {target} > {message}");
			const record = createLogRecord(LogLevel.Info, "Hello", "test");

			const formatted = formatter.format(record);
			expect(formatted).to.equal("INFO | test > Hello");
		});

		it("should handle missing metadata", () => {
			const formatter = new CustomFormatter("{message} {metadata}");
			const record = createLogRecord(LogLevel.Info, "Test", "test");

			const formatted = formatter.format(record);
			expect(formatted).to.equal("Test ");
		});

		it("should replace all placeholders", () => {
			const formatter = new CustomFormatter(
				"[{timestamp}] [{level}] [{target}] {message} {metadata}",
			);

			const record = createLogRecord(
				LogLevel.Debug,
				"Debug info",
				"app",
				{ foo: "bar" },
			);

			const formatted = formatter.format(record);
			expect(formatted).to.include("[DEBUG]");
			expect(formatted).to.include("[app]");
			expect(formatted).to.include("Debug info");
		});
	});

	describe("ColorFormatter", () => {
		it("should format without colors when disabled", () => {
			const formatter = new ColorFormatter({
				showLevel: true,
				showTarget: true,
				useColor: false,
			});

			const record = createLogRecord(LogLevel.Error, "Error", "test");
			const formatted = formatter.format(record);

			// Should be same as SimpleFormatter when colors are disabled
			const simpleFormatter = new SimpleFormatter({
				showLevel: true,
				showTarget: true,
			});
			const simpleFormatted = simpleFormatter.format(record);

			expect(formatted).to.equal(simpleFormatted);
		});

		it("should format with all fields", () => {
			const formatter = new ColorFormatter({
				showTimestamp: true,
				showLevel: true,
				showTarget: true,
				showLocation: true,
				showMetadata: true,
				useColor: true,
			});

			const record = createLogRecord(
				LogLevel.Info,
				"Colorful message",
				"color.test",
				{ data: "value" },
			);

			const formatted = formatter.format(record);
			expect(formatted).to.be.a("string");
			expect(formatted).to.include("[INFO]");
			expect(formatted).to.include("[color.test]");
			expect(formatted).to.include("Colorful message");
		});
	});
};