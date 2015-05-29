#!/usr/bin/env node
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = main;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _index = require("./index");

var _index2 = _interopRequireDefault(_index);

var _promise = require("./promise");

var _promise2 = _interopRequireDefault(_promise);

var SUCCESS = _promise2["default"].resolve(null);

function printHelp(stdout) {
  stdout.write("\nUsage: npm-run-all [OPTIONS] [...tasks]\n\n  Run specified tasks.\n\n  Options:\n    -h, --help                  Print this text.\n    -p, --parallel [...tasks]   Run a group of tasks in parallel.\n    -s, --sequential [...tasks] Run a group of tasks sequentially.\n    -v, --version               Print version number.\n\n  See Also:\n    https://github.com/mysticatea/npm-run-all\n\n");
}

function printVersion(stdout) {
  stdout.write("v" + require("../package.json").version + "\n");
}

function createQueue(args) {
  return args.reduce(function (queue, arg) {
    switch (arg) {
      case "-s":
      case "--sequential":
        queue.push({ parallel: false, tasks: [] });
        break;

      case "-p":
      case "--parallel":
        queue.push({ parallel: true, tasks: [] });
        break;

      default:
        if (arg[0] === "-") {
          throw new Error("Invalid Option: " + arg);
        }
        queue[queue.length - 1].tasks.push(arg);
        break;
    }
    return queue;
  }, [{ parallel: false, tasks: [] }]);
}

function main(args) {
  var stdout = arguments[1] === undefined ? process.stdout : arguments[1];
  var stderr = arguments[2] === undefined ? process.stderr : arguments[2];

  if (args.length === 0) {
    args.push("--help");
  }
  switch (args[0]) {
    case "-h":
    case "--help":
      printHelp(stdout);
      return SUCCESS;

    case "-v":
    case "--version":
      printVersion(stdout);
      return SUCCESS;
  }

  var queue = undefined;
  try {
    queue = createQueue(args);
  } catch (err) {
    return _promise2["default"].reject(err);
  }

  return (function next() {
    var _again = true;

    _function: while (_again) {
      group = options = undefined;
      _again = false;

      var group = queue.shift();
      if (group == null) {
        return SUCCESS;
      }
      if (group.tasks.length === 0) {
        _again = true;
        continue _function;
      }

      var options = {
        stdout: stdout,
        stderr: stderr,
        parallel: group.parallel
      };
      return (0, _index2["default"])(group.tasks, options).then(next);
    }
  })();
}

/*eslint no-process-exit:0*/
if (require.main === module) {
  main(process.argv.slice(2))["catch"](function (err) {
    console.log("ERROR:", err.message);
    process.exit(1);
  });
}
module.exports = exports["default"];