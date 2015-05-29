"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

//------------------------------------------------------------------------------
exports["default"] = runAll;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _child_process = require("child_process");

var _path = require("path");

var _minimatch = require("minimatch");

var _minimatch2 = _interopRequireDefault(_minimatch);

var _promise = require("./promise");

var _promise2 = _interopRequireDefault(_promise);

function toArray(x) {
  if (x == null) {
    return [];
  }
  return Array.isArray(x) ? x : [x];
}

//------------------------------------------------------------------------------
function readTaskList() {
  try {
    var packageJsonPath = (0, _path.join)(process.cwd(), "package.json");
    var packageJson = require(packageJsonPath);
    var scripts = packageJson && packageJson.scripts;
    if (typeof scripts === "object" && Array.isArray(scripts) === false) {
      return Object.keys(scripts);
    }
  } catch (err) {
    console.error("ERROR:", err.message);
  }

  return null;
}

//------------------------------------------------------------------------------
var COLON_OR_SLASH = /[:\/]/g;
var CONVERT_MAP = { ":": "/", "/": ":" };

function swapColonAndSlash(s) {
  return s.replace(COLON_OR_SLASH, function (matched) {
    return CONVERT_MAP[matched];
  });
}

function filterTasks(taskList, patterns) {
  // Replace ":" to "/", in order to use as separator in minimatch.
  var filters = patterns.map(function (pattern) {
    // Separate arguments.
    var trimmed = pattern.trim();
    var spacePos = trimmed.indexOf(" ");
    var task = spacePos < 0 ? trimmed : trimmed.slice(0, spacePos);
    var args = spacePos < 0 ? "" : trimmed.slice(spacePos);
    var filter = _minimatch2["default"].filter(swapColonAndSlash(task));
    filter.args = args;

    return filter;
  });
  var candidates = taskList.map(swapColonAndSlash);

  // Take tasks while keep the order of patterns.
  var retv = [];
  var matched = Object.create(null);
  filters.forEach(function (filter) {
    candidates.forEach(function (task) {
      if (filter(task)) {
        // Merge matched task and arguments.
        var command = swapColonAndSlash(task) + filter.args;

        // Check duplications.
        if (matched[command] !== true) {
          matched[command] = true;
          retv.push(command);
        }
      }
    });
  });

  return retv;
}

//------------------------------------------------------------------------------
function defineExec() {
  if (process.platform === "win32") {
    var _ret = (function () {
      var FILE = process.env.comspec || "cmd.exe";
      var OPTIONS = { windowsVerbatimArguments: true };
      return {
        v: function (command) {
          return (0, _child_process.spawn)(FILE, ["/s", "/c", "\"" + command + "\""], OPTIONS);
        }
      };
    })();

    if (typeof _ret === "object") return _ret.v;
  } else {
    return function (command) {
      return (0, _child_process.spawn)("/bin/sh", ["-c", command]);
    };
  }
}

var exec = defineExec();

function runTask(task, stdin, stdout, stderr) {
  return new _promise2["default"](function (resolve, reject) {
    // Execute.
    var cp = exec("npm run-script --color=always " + task);

    // Piping stdio.
    if (stdin) {
      stdin.pipe(cp.stdin);
    }
    if (stdout) {
      cp.stdout.pipe(stdout);
    }
    if (stderr) {
      cp.stderr.pipe(stderr);
    }

    // Register
    cp.on("exit", function (code) {
      if (code) {
        reject(new Error("" + task + ": None-Zero Exit(" + code + ");"));
      } else {
        resolve(null);
      }
    });
    cp.on("error", reject);
  });
}
function runAll(_tasks, _options) {
  var patterns = toArray(_tasks);
  if (patterns.length === 0) {
    return _promise2["default"].resolve(null);
  }

  var options = _options || {};
  var parallel = Boolean(options.parallel);
  var stdin = options.stdin || null;
  var stdout = options.stdout || null;
  var stderr = options.stderr || null;
  var taskList = options.taskList || readTaskList();

  if (Array.isArray(taskList) === false) {
    return _promise2["default"].reject(new Error(options.taskList ? "Invalid TaskList: " + options.taskList :
    /* else */"Not Found: " + (0, _path.join)(process.cwd(), "package.json")));
  }

  var tasks = filterTasks(taskList, patterns);
  if (tasks.length === 0) {
    return _promise2["default"].reject(new Error("Matched tasks not found: " + patterns.join(", ")));
  }

  if (parallel) {
    return _promise2["default"].all(tasks.map(function (task) {
      return runTask(task, stdin, stdout, stderr);
    }));
  }
  return (function next() {
    var task = tasks.shift();
    return task && runTask(task, stdin, stdout, stderr).then(next);
  })();
}

module.exports = exports["default"];