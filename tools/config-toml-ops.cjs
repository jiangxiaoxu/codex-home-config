"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// node_modules/@iarna/toml/lib/parser.js
var require_parser = __commonJS({
  "node_modules/@iarna/toml/lib/parser.js"(exports2, module2) {
    "use strict";
    var ParserEND = 1114112;
    var ParserError = class _ParserError extends Error {
      /* istanbul ignore next */
      constructor(msg, filename, linenumber) {
        super("[ParserError] " + msg, filename, linenumber);
        this.name = "ParserError";
        this.code = "ParserError";
        if (Error.captureStackTrace) Error.captureStackTrace(this, _ParserError);
      }
    };
    var State = class {
      constructor(parser) {
        this.parser = parser;
        this.buf = "";
        this.returned = null;
        this.result = null;
        this.resultTable = null;
        this.resultArr = null;
      }
    };
    var Parser = class {
      constructor() {
        this.pos = 0;
        this.col = 0;
        this.line = 0;
        this.obj = {};
        this.ctx = this.obj;
        this.stack = [];
        this._buf = "";
        this.char = null;
        this.ii = 0;
        this.state = new State(this.parseStart);
      }
      parse(str) {
        if (str.length === 0 || str.length == null) return;
        this._buf = String(str);
        this.ii = -1;
        this.char = -1;
        let getNext;
        while (getNext === false || this.nextChar()) {
          getNext = this.runOne();
        }
        this._buf = null;
      }
      nextChar() {
        if (this.char === 10) {
          ++this.line;
          this.col = -1;
        }
        ++this.ii;
        this.char = this._buf.codePointAt(this.ii);
        ++this.pos;
        ++this.col;
        return this.haveBuffer();
      }
      haveBuffer() {
        return this.ii < this._buf.length;
      }
      runOne() {
        return this.state.parser.call(this, this.state.returned);
      }
      finish() {
        this.char = ParserEND;
        let last;
        do {
          last = this.state.parser;
          this.runOne();
        } while (this.state.parser !== last);
        this.ctx = null;
        this.state = null;
        this._buf = null;
        return this.obj;
      }
      next(fn) {
        if (typeof fn !== "function") throw new ParserError("Tried to set state to non-existent state: " + JSON.stringify(fn));
        this.state.parser = fn;
      }
      goto(fn) {
        this.next(fn);
        return this.runOne();
      }
      call(fn, returnWith) {
        if (returnWith) this.next(returnWith);
        this.stack.push(this.state);
        this.state = new State(fn);
      }
      callNow(fn, returnWith) {
        this.call(fn, returnWith);
        return this.runOne();
      }
      return(value) {
        if (this.stack.length === 0) throw this.error(new ParserError("Stack underflow"));
        if (value === void 0) value = this.state.buf;
        this.state = this.stack.pop();
        this.state.returned = value;
      }
      returnNow(value) {
        this.return(value);
        return this.runOne();
      }
      consume() {
        if (this.char === ParserEND) throw this.error(new ParserError("Unexpected end-of-buffer"));
        this.state.buf += this._buf[this.ii];
      }
      error(err) {
        err.line = this.line;
        err.col = this.col;
        err.pos = this.pos;
        return err;
      }
      /* istanbul ignore next */
      parseStart() {
        throw new ParserError("Must declare a parseStart method");
      }
    };
    Parser.END = ParserEND;
    Parser.Error = ParserError;
    module2.exports = Parser;
  }
});

// node_modules/@iarna/toml/lib/create-datetime.js
var require_create_datetime = __commonJS({
  "node_modules/@iarna/toml/lib/create-datetime.js"(exports2, module2) {
    "use strict";
    module2.exports = (value) => {
      const date = new Date(value);
      if (isNaN(date)) {
        throw new TypeError("Invalid Datetime");
      } else {
        return date;
      }
    };
  }
});

// node_modules/@iarna/toml/lib/format-num.js
var require_format_num = __commonJS({
  "node_modules/@iarna/toml/lib/format-num.js"(exports2, module2) {
    "use strict";
    module2.exports = (d, num) => {
      num = String(num);
      while (num.length < d) num = "0" + num;
      return num;
    };
  }
});

// node_modules/@iarna/toml/lib/create-datetime-float.js
var require_create_datetime_float = __commonJS({
  "node_modules/@iarna/toml/lib/create-datetime-float.js"(exports2, module2) {
    "use strict";
    var f = require_format_num();
    var FloatingDateTime = class extends Date {
      constructor(value) {
        super(value + "Z");
        this.isFloating = true;
      }
      toISOString() {
        const date = `${this.getUTCFullYear()}-${f(2, this.getUTCMonth() + 1)}-${f(2, this.getUTCDate())}`;
        const time = `${f(2, this.getUTCHours())}:${f(2, this.getUTCMinutes())}:${f(2, this.getUTCSeconds())}.${f(3, this.getUTCMilliseconds())}`;
        return `${date}T${time}`;
      }
    };
    module2.exports = (value) => {
      const date = new FloatingDateTime(value);
      if (isNaN(date)) {
        throw new TypeError("Invalid Datetime");
      } else {
        return date;
      }
    };
  }
});

// node_modules/@iarna/toml/lib/create-date.js
var require_create_date = __commonJS({
  "node_modules/@iarna/toml/lib/create-date.js"(exports2, module2) {
    "use strict";
    var f = require_format_num();
    var DateTime = global.Date;
    var Date2 = class extends DateTime {
      constructor(value) {
        super(value);
        this.isDate = true;
      }
      toISOString() {
        return `${this.getUTCFullYear()}-${f(2, this.getUTCMonth() + 1)}-${f(2, this.getUTCDate())}`;
      }
    };
    module2.exports = (value) => {
      const date = new Date2(value);
      if (isNaN(date)) {
        throw new TypeError("Invalid Datetime");
      } else {
        return date;
      }
    };
  }
});

// node_modules/@iarna/toml/lib/create-time.js
var require_create_time = __commonJS({
  "node_modules/@iarna/toml/lib/create-time.js"(exports2, module2) {
    "use strict";
    var f = require_format_num();
    var Time = class extends Date {
      constructor(value) {
        super(`0000-01-01T${value}Z`);
        this.isTime = true;
      }
      toISOString() {
        return `${f(2, this.getUTCHours())}:${f(2, this.getUTCMinutes())}:${f(2, this.getUTCSeconds())}.${f(3, this.getUTCMilliseconds())}`;
      }
    };
    module2.exports = (value) => {
      const date = new Time(value);
      if (isNaN(date)) {
        throw new TypeError("Invalid Datetime");
      } else {
        return date;
      }
    };
  }
});

// node_modules/@iarna/toml/lib/toml-parser.js
var require_toml_parser = __commonJS({
  "node_modules/@iarna/toml/lib/toml-parser.js"(exports, module) {
    "use strict";
    module.exports = makeParserClass(require_parser());
    module.exports.makeParserClass = makeParserClass;
    var TomlError = class _TomlError extends Error {
      constructor(msg) {
        super(msg);
        this.name = "TomlError";
        if (Error.captureStackTrace) Error.captureStackTrace(this, _TomlError);
        this.fromTOML = true;
        this.wrapped = null;
      }
    };
    TomlError.wrap = (err) => {
      const terr = new TomlError(err.message);
      terr.code = err.code;
      terr.wrapped = err;
      return terr;
    };
    module.exports.TomlError = TomlError;
    var createDateTime = require_create_datetime();
    var createDateTimeFloat = require_create_datetime_float();
    var createDate = require_create_date();
    var createTime = require_create_time();
    var CTRL_I = 9;
    var CTRL_J = 10;
    var CTRL_M = 13;
    var CTRL_CHAR_BOUNDARY = 31;
    var CHAR_SP = 32;
    var CHAR_QUOT = 34;
    var CHAR_NUM = 35;
    var CHAR_APOS = 39;
    var CHAR_PLUS = 43;
    var CHAR_COMMA = 44;
    var CHAR_HYPHEN = 45;
    var CHAR_PERIOD = 46;
    var CHAR_0 = 48;
    var CHAR_1 = 49;
    var CHAR_7 = 55;
    var CHAR_9 = 57;
    var CHAR_COLON = 58;
    var CHAR_EQUALS = 61;
    var CHAR_A = 65;
    var CHAR_E = 69;
    var CHAR_F = 70;
    var CHAR_T = 84;
    var CHAR_U = 85;
    var CHAR_Z = 90;
    var CHAR_LOWBAR = 95;
    var CHAR_a = 97;
    var CHAR_b = 98;
    var CHAR_e = 101;
    var CHAR_f = 102;
    var CHAR_i = 105;
    var CHAR_l = 108;
    var CHAR_n = 110;
    var CHAR_o = 111;
    var CHAR_r = 114;
    var CHAR_s = 115;
    var CHAR_t = 116;
    var CHAR_u = 117;
    var CHAR_x = 120;
    var CHAR_z = 122;
    var CHAR_LCUB = 123;
    var CHAR_RCUB = 125;
    var CHAR_LSQB = 91;
    var CHAR_BSOL = 92;
    var CHAR_RSQB = 93;
    var CHAR_DEL = 127;
    var SURROGATE_FIRST = 55296;
    var SURROGATE_LAST = 57343;
    var escapes = {
      [CHAR_b]: "\b",
      [CHAR_t]: "	",
      [CHAR_n]: "\n",
      [CHAR_f]: "\f",
      [CHAR_r]: "\r",
      [CHAR_QUOT]: '"',
      [CHAR_BSOL]: "\\"
    };
    function isDigit(cp) {
      return cp >= CHAR_0 && cp <= CHAR_9;
    }
    function isHexit(cp) {
      return cp >= CHAR_A && cp <= CHAR_F || cp >= CHAR_a && cp <= CHAR_f || cp >= CHAR_0 && cp <= CHAR_9;
    }
    function isBit(cp) {
      return cp === CHAR_1 || cp === CHAR_0;
    }
    function isOctit(cp) {
      return cp >= CHAR_0 && cp <= CHAR_7;
    }
    function isAlphaNumQuoteHyphen(cp) {
      return cp >= CHAR_A && cp <= CHAR_Z || cp >= CHAR_a && cp <= CHAR_z || cp >= CHAR_0 && cp <= CHAR_9 || cp === CHAR_APOS || cp === CHAR_QUOT || cp === CHAR_LOWBAR || cp === CHAR_HYPHEN;
    }
    function isAlphaNumHyphen(cp) {
      return cp >= CHAR_A && cp <= CHAR_Z || cp >= CHAR_a && cp <= CHAR_z || cp >= CHAR_0 && cp <= CHAR_9 || cp === CHAR_LOWBAR || cp === CHAR_HYPHEN;
    }
    var _type = Symbol("type");
    var _declared = Symbol("declared");
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    var defineProperty = Object.defineProperty;
    var descriptor = { configurable: true, enumerable: true, writable: true, value: void 0 };
    function hasKey(obj, key) {
      if (hasOwnProperty.call(obj, key)) return true;
      if (key === "__proto__") defineProperty(obj, "__proto__", descriptor);
      return false;
    }
    var INLINE_TABLE = Symbol("inline-table");
    function InlineTable() {
      return Object.defineProperties({}, {
        [_type]: { value: INLINE_TABLE }
      });
    }
    function isInlineTable(obj) {
      if (obj === null || typeof obj !== "object") return false;
      return obj[_type] === INLINE_TABLE;
    }
    var TABLE = Symbol("table");
    function Table() {
      return Object.defineProperties({}, {
        [_type]: { value: TABLE },
        [_declared]: { value: false, writable: true }
      });
    }
    function isTable(obj) {
      if (obj === null || typeof obj !== "object") return false;
      return obj[_type] === TABLE;
    }
    var _contentType = Symbol("content-type");
    var INLINE_LIST = Symbol("inline-list");
    function InlineList(type) {
      return Object.defineProperties([], {
        [_type]: { value: INLINE_LIST },
        [_contentType]: { value: type }
      });
    }
    function isInlineList(obj) {
      if (obj === null || typeof obj !== "object") return false;
      return obj[_type] === INLINE_LIST;
    }
    var LIST = Symbol("list");
    function List() {
      return Object.defineProperties([], {
        [_type]: { value: LIST }
      });
    }
    function isList(obj) {
      if (obj === null || typeof obj !== "object") return false;
      return obj[_type] === LIST;
    }
    var _custom;
    try {
      const utilInspect = eval("require('util').inspect");
      _custom = utilInspect.custom;
    } catch (_) {
    }
    var _inspect = _custom || "inspect";
    var BoxedBigInt = class {
      constructor(value) {
        try {
          this.value = global.BigInt.asIntN(64, value);
        } catch (_) {
          this.value = null;
        }
        Object.defineProperty(this, _type, { value: INTEGER });
      }
      isNaN() {
        return this.value === null;
      }
      /* istanbul ignore next */
      toString() {
        return String(this.value);
      }
      /* istanbul ignore next */
      [_inspect]() {
        return `[BigInt: ${this.toString()}]}`;
      }
      valueOf() {
        return this.value;
      }
    };
    var INTEGER = Symbol("integer");
    function Integer(value) {
      let num = Number(value);
      if (Object.is(num, -0)) num = 0;
      if (global.BigInt && !Number.isSafeInteger(num)) {
        return new BoxedBigInt(value);
      } else {
        return Object.defineProperties(new Number(num), {
          isNaN: { value: function() {
            return isNaN(this);
          } },
          [_type]: { value: INTEGER },
          [_inspect]: { value: () => `[Integer: ${value}]` }
        });
      }
    }
    function isInteger(obj) {
      if (obj === null || typeof obj !== "object") return false;
      return obj[_type] === INTEGER;
    }
    var FLOAT = Symbol("float");
    function Float(value) {
      return Object.defineProperties(new Number(value), {
        [_type]: { value: FLOAT },
        [_inspect]: { value: () => `[Float: ${value}]` }
      });
    }
    function isFloat(obj) {
      if (obj === null || typeof obj !== "object") return false;
      return obj[_type] === FLOAT;
    }
    function tomlType(value) {
      const type = typeof value;
      if (type === "object") {
        if (value === null) return "null";
        if (value instanceof Date) return "datetime";
        if (_type in value) {
          switch (value[_type]) {
            case INLINE_TABLE:
              return "inline-table";
            case INLINE_LIST:
              return "inline-list";
            /* istanbul ignore next */
            case TABLE:
              return "table";
            /* istanbul ignore next */
            case LIST:
              return "list";
            case FLOAT:
              return "float";
            case INTEGER:
              return "integer";
          }
        }
      }
      return type;
    }
    function makeParserClass(Parser) {
      class TOMLParser extends Parser {
        constructor() {
          super();
          this.ctx = this.obj = Table();
        }
        /* MATCH HELPER */
        atEndOfWord() {
          return this.char === CHAR_NUM || this.char === CTRL_I || this.char === CHAR_SP || this.atEndOfLine();
        }
        atEndOfLine() {
          return this.char === Parser.END || this.char === CTRL_J || this.char === CTRL_M;
        }
        parseStart() {
          if (this.char === Parser.END) {
            return null;
          } else if (this.char === CHAR_LSQB) {
            return this.call(this.parseTableOrList);
          } else if (this.char === CHAR_NUM) {
            return this.call(this.parseComment);
          } else if (this.char === CTRL_J || this.char === CHAR_SP || this.char === CTRL_I || this.char === CTRL_M) {
            return null;
          } else if (isAlphaNumQuoteHyphen(this.char)) {
            return this.callNow(this.parseAssignStatement);
          } else {
            throw this.error(new TomlError(`Unknown character "${this.char}"`));
          }
        }
        // HELPER, this strips any whitespace and comments to the end of the line
        // then RETURNS. Last state in a production.
        parseWhitespaceToEOL() {
          if (this.char === CHAR_SP || this.char === CTRL_I || this.char === CTRL_M) {
            return null;
          } else if (this.char === CHAR_NUM) {
            return this.goto(this.parseComment);
          } else if (this.char === Parser.END || this.char === CTRL_J) {
            return this.return();
          } else {
            throw this.error(new TomlError("Unexpected character, expected only whitespace or comments till end of line"));
          }
        }
        /* ASSIGNMENT: key = value */
        parseAssignStatement() {
          return this.callNow(this.parseAssign, this.recordAssignStatement);
        }
        recordAssignStatement(kv) {
          let target = this.ctx;
          let finalKey = kv.key.pop();
          for (let kw of kv.key) {
            if (hasKey(target, kw) && (!isTable(target[kw]) || target[kw][_declared])) {
              throw this.error(new TomlError("Can't redefine existing key"));
            }
            target = target[kw] = target[kw] || Table();
          }
          if (hasKey(target, finalKey)) {
            throw this.error(new TomlError("Can't redefine existing key"));
          }
          if (isInteger(kv.value) || isFloat(kv.value)) {
            target[finalKey] = kv.value.valueOf();
          } else {
            target[finalKey] = kv.value;
          }
          return this.goto(this.parseWhitespaceToEOL);
        }
        /* ASSSIGNMENT expression, key = value possibly inside an inline table */
        parseAssign() {
          return this.callNow(this.parseKeyword, this.recordAssignKeyword);
        }
        recordAssignKeyword(key) {
          if (this.state.resultTable) {
            this.state.resultTable.push(key);
          } else {
            this.state.resultTable = [key];
          }
          return this.goto(this.parseAssignKeywordPreDot);
        }
        parseAssignKeywordPreDot() {
          if (this.char === CHAR_PERIOD) {
            return this.next(this.parseAssignKeywordPostDot);
          } else if (this.char !== CHAR_SP && this.char !== CTRL_I) {
            return this.goto(this.parseAssignEqual);
          }
        }
        parseAssignKeywordPostDot() {
          if (this.char !== CHAR_SP && this.char !== CTRL_I) {
            return this.callNow(this.parseKeyword, this.recordAssignKeyword);
          }
        }
        parseAssignEqual() {
          if (this.char === CHAR_EQUALS) {
            return this.next(this.parseAssignPreValue);
          } else {
            throw this.error(new TomlError('Invalid character, expected "="'));
          }
        }
        parseAssignPreValue() {
          if (this.char === CHAR_SP || this.char === CTRL_I) {
            return null;
          } else {
            return this.callNow(this.parseValue, this.recordAssignValue);
          }
        }
        recordAssignValue(value) {
          return this.returnNow({ key: this.state.resultTable, value });
        }
        /* COMMENTS: #...eol */
        parseComment() {
          do {
            if (this.char === Parser.END || this.char === CTRL_J) {
              return this.return();
            }
          } while (this.nextChar());
        }
        /* TABLES AND LISTS, [foo] and [[foo]] */
        parseTableOrList() {
          if (this.char === CHAR_LSQB) {
            this.next(this.parseList);
          } else {
            return this.goto(this.parseTable);
          }
        }
        /* TABLE [foo.bar.baz] */
        parseTable() {
          this.ctx = this.obj;
          return this.goto(this.parseTableNext);
        }
        parseTableNext() {
          if (this.char === CHAR_SP || this.char === CTRL_I) {
            return null;
          } else {
            return this.callNow(this.parseKeyword, this.parseTableMore);
          }
        }
        parseTableMore(keyword) {
          if (this.char === CHAR_SP || this.char === CTRL_I) {
            return null;
          } else if (this.char === CHAR_RSQB) {
            if (hasKey(this.ctx, keyword) && (!isTable(this.ctx[keyword]) || this.ctx[keyword][_declared])) {
              throw this.error(new TomlError("Can't redefine existing key"));
            } else {
              this.ctx = this.ctx[keyword] = this.ctx[keyword] || Table();
              this.ctx[_declared] = true;
            }
            return this.next(this.parseWhitespaceToEOL);
          } else if (this.char === CHAR_PERIOD) {
            if (!hasKey(this.ctx, keyword)) {
              this.ctx = this.ctx[keyword] = Table();
            } else if (isTable(this.ctx[keyword])) {
              this.ctx = this.ctx[keyword];
            } else if (isList(this.ctx[keyword])) {
              this.ctx = this.ctx[keyword][this.ctx[keyword].length - 1];
            } else {
              throw this.error(new TomlError("Can't redefine existing key"));
            }
            return this.next(this.parseTableNext);
          } else {
            throw this.error(new TomlError("Unexpected character, expected whitespace, . or ]"));
          }
        }
        /* LIST [[a.b.c]] */
        parseList() {
          this.ctx = this.obj;
          return this.goto(this.parseListNext);
        }
        parseListNext() {
          if (this.char === CHAR_SP || this.char === CTRL_I) {
            return null;
          } else {
            return this.callNow(this.parseKeyword, this.parseListMore);
          }
        }
        parseListMore(keyword) {
          if (this.char === CHAR_SP || this.char === CTRL_I) {
            return null;
          } else if (this.char === CHAR_RSQB) {
            if (!hasKey(this.ctx, keyword)) {
              this.ctx[keyword] = List();
            }
            if (isInlineList(this.ctx[keyword])) {
              throw this.error(new TomlError("Can't extend an inline array"));
            } else if (isList(this.ctx[keyword])) {
              const next = Table();
              this.ctx[keyword].push(next);
              this.ctx = next;
            } else {
              throw this.error(new TomlError("Can't redefine an existing key"));
            }
            return this.next(this.parseListEnd);
          } else if (this.char === CHAR_PERIOD) {
            if (!hasKey(this.ctx, keyword)) {
              this.ctx = this.ctx[keyword] = Table();
            } else if (isInlineList(this.ctx[keyword])) {
              throw this.error(new TomlError("Can't extend an inline array"));
            } else if (isInlineTable(this.ctx[keyword])) {
              throw this.error(new TomlError("Can't extend an inline table"));
            } else if (isList(this.ctx[keyword])) {
              this.ctx = this.ctx[keyword][this.ctx[keyword].length - 1];
            } else if (isTable(this.ctx[keyword])) {
              this.ctx = this.ctx[keyword];
            } else {
              throw this.error(new TomlError("Can't redefine an existing key"));
            }
            return this.next(this.parseListNext);
          } else {
            throw this.error(new TomlError("Unexpected character, expected whitespace, . or ]"));
          }
        }
        parseListEnd(keyword) {
          if (this.char === CHAR_RSQB) {
            return this.next(this.parseWhitespaceToEOL);
          } else {
            throw this.error(new TomlError("Unexpected character, expected whitespace, . or ]"));
          }
        }
        /* VALUE string, number, boolean, inline list, inline object */
        parseValue() {
          if (this.char === Parser.END) {
            throw this.error(new TomlError("Key without value"));
          } else if (this.char === CHAR_QUOT) {
            return this.next(this.parseDoubleString);
          }
          if (this.char === CHAR_APOS) {
            return this.next(this.parseSingleString);
          } else if (this.char === CHAR_HYPHEN || this.char === CHAR_PLUS) {
            return this.goto(this.parseNumberSign);
          } else if (this.char === CHAR_i) {
            return this.next(this.parseInf);
          } else if (this.char === CHAR_n) {
            return this.next(this.parseNan);
          } else if (isDigit(this.char)) {
            return this.goto(this.parseNumberOrDateTime);
          } else if (this.char === CHAR_t || this.char === CHAR_f) {
            return this.goto(this.parseBoolean);
          } else if (this.char === CHAR_LSQB) {
            return this.call(this.parseInlineList, this.recordValue);
          } else if (this.char === CHAR_LCUB) {
            return this.call(this.parseInlineTable, this.recordValue);
          } else {
            throw this.error(new TomlError("Unexpected character, expecting string, number, datetime, boolean, inline array or inline table"));
          }
        }
        recordValue(value) {
          return this.returnNow(value);
        }
        parseInf() {
          if (this.char === CHAR_n) {
            return this.next(this.parseInf2);
          } else {
            throw this.error(new TomlError('Unexpected character, expected "inf", "+inf" or "-inf"'));
          }
        }
        parseInf2() {
          if (this.char === CHAR_f) {
            if (this.state.buf === "-") {
              return this.return(-Infinity);
            } else {
              return this.return(Infinity);
            }
          } else {
            throw this.error(new TomlError('Unexpected character, expected "inf", "+inf" or "-inf"'));
          }
        }
        parseNan() {
          if (this.char === CHAR_a) {
            return this.next(this.parseNan2);
          } else {
            throw this.error(new TomlError('Unexpected character, expected "nan"'));
          }
        }
        parseNan2() {
          if (this.char === CHAR_n) {
            return this.return(NaN);
          } else {
            throw this.error(new TomlError('Unexpected character, expected "nan"'));
          }
        }
        /* KEYS, barewords or basic, literal, or dotted */
        parseKeyword() {
          if (this.char === CHAR_QUOT) {
            return this.next(this.parseBasicString);
          } else if (this.char === CHAR_APOS) {
            return this.next(this.parseLiteralString);
          } else {
            return this.goto(this.parseBareKey);
          }
        }
        /* KEYS: barewords */
        parseBareKey() {
          do {
            if (this.char === Parser.END) {
              throw this.error(new TomlError("Key ended without value"));
            } else if (isAlphaNumHyphen(this.char)) {
              this.consume();
            } else if (this.state.buf.length === 0) {
              throw this.error(new TomlError("Empty bare keys are not allowed"));
            } else {
              return this.returnNow();
            }
          } while (this.nextChar());
        }
        /* STRINGS, single quoted (literal) */
        parseSingleString() {
          if (this.char === CHAR_APOS) {
            return this.next(this.parseLiteralMultiStringMaybe);
          } else {
            return this.goto(this.parseLiteralString);
          }
        }
        parseLiteralString() {
          do {
            if (this.char === CHAR_APOS) {
              return this.return();
            } else if (this.atEndOfLine()) {
              throw this.error(new TomlError("Unterminated string"));
            } else if (this.char === CHAR_DEL || this.char <= CTRL_CHAR_BOUNDARY && this.char !== CTRL_I) {
              throw this.errorControlCharInString();
            } else {
              this.consume();
            }
          } while (this.nextChar());
        }
        parseLiteralMultiStringMaybe() {
          if (this.char === CHAR_APOS) {
            return this.next(this.parseLiteralMultiString);
          } else {
            return this.returnNow();
          }
        }
        parseLiteralMultiString() {
          if (this.char === CTRL_M) {
            return null;
          } else if (this.char === CTRL_J) {
            return this.next(this.parseLiteralMultiStringContent);
          } else {
            return this.goto(this.parseLiteralMultiStringContent);
          }
        }
        parseLiteralMultiStringContent() {
          do {
            if (this.char === CHAR_APOS) {
              return this.next(this.parseLiteralMultiEnd);
            } else if (this.char === Parser.END) {
              throw this.error(new TomlError("Unterminated multi-line string"));
            } else if (this.char === CHAR_DEL || this.char <= CTRL_CHAR_BOUNDARY && this.char !== CTRL_I && this.char !== CTRL_J && this.char !== CTRL_M) {
              throw this.errorControlCharInString();
            } else {
              this.consume();
            }
          } while (this.nextChar());
        }
        parseLiteralMultiEnd() {
          if (this.char === CHAR_APOS) {
            return this.next(this.parseLiteralMultiEnd2);
          } else {
            this.state.buf += "'";
            return this.goto(this.parseLiteralMultiStringContent);
          }
        }
        parseLiteralMultiEnd2() {
          if (this.char === CHAR_APOS) {
            return this.return();
          } else {
            this.state.buf += "''";
            return this.goto(this.parseLiteralMultiStringContent);
          }
        }
        /* STRINGS double quoted */
        parseDoubleString() {
          if (this.char === CHAR_QUOT) {
            return this.next(this.parseMultiStringMaybe);
          } else {
            return this.goto(this.parseBasicString);
          }
        }
        parseBasicString() {
          do {
            if (this.char === CHAR_BSOL) {
              return this.call(this.parseEscape, this.recordEscapeReplacement);
            } else if (this.char === CHAR_QUOT) {
              return this.return();
            } else if (this.atEndOfLine()) {
              throw this.error(new TomlError("Unterminated string"));
            } else if (this.char === CHAR_DEL || this.char <= CTRL_CHAR_BOUNDARY && this.char !== CTRL_I) {
              throw this.errorControlCharInString();
            } else {
              this.consume();
            }
          } while (this.nextChar());
        }
        recordEscapeReplacement(replacement) {
          this.state.buf += replacement;
          return this.goto(this.parseBasicString);
        }
        parseMultiStringMaybe() {
          if (this.char === CHAR_QUOT) {
            return this.next(this.parseMultiString);
          } else {
            return this.returnNow();
          }
        }
        parseMultiString() {
          if (this.char === CTRL_M) {
            return null;
          } else if (this.char === CTRL_J) {
            return this.next(this.parseMultiStringContent);
          } else {
            return this.goto(this.parseMultiStringContent);
          }
        }
        parseMultiStringContent() {
          do {
            if (this.char === CHAR_BSOL) {
              return this.call(this.parseMultiEscape, this.recordMultiEscapeReplacement);
            } else if (this.char === CHAR_QUOT) {
              return this.next(this.parseMultiEnd);
            } else if (this.char === Parser.END) {
              throw this.error(new TomlError("Unterminated multi-line string"));
            } else if (this.char === CHAR_DEL || this.char <= CTRL_CHAR_BOUNDARY && this.char !== CTRL_I && this.char !== CTRL_J && this.char !== CTRL_M) {
              throw this.errorControlCharInString();
            } else {
              this.consume();
            }
          } while (this.nextChar());
        }
        errorControlCharInString() {
          let displayCode = "\\u00";
          if (this.char < 16) {
            displayCode += "0";
          }
          displayCode += this.char.toString(16);
          return this.error(new TomlError(`Control characters (codes < 0x1f and 0x7f) are not allowed in strings, use ${displayCode} instead`));
        }
        recordMultiEscapeReplacement(replacement) {
          this.state.buf += replacement;
          return this.goto(this.parseMultiStringContent);
        }
        parseMultiEnd() {
          if (this.char === CHAR_QUOT) {
            return this.next(this.parseMultiEnd2);
          } else {
            this.state.buf += '"';
            return this.goto(this.parseMultiStringContent);
          }
        }
        parseMultiEnd2() {
          if (this.char === CHAR_QUOT) {
            return this.return();
          } else {
            this.state.buf += '""';
            return this.goto(this.parseMultiStringContent);
          }
        }
        parseMultiEscape() {
          if (this.char === CTRL_M || this.char === CTRL_J) {
            return this.next(this.parseMultiTrim);
          } else if (this.char === CHAR_SP || this.char === CTRL_I) {
            return this.next(this.parsePreMultiTrim);
          } else {
            return this.goto(this.parseEscape);
          }
        }
        parsePreMultiTrim() {
          if (this.char === CHAR_SP || this.char === CTRL_I) {
            return null;
          } else if (this.char === CTRL_M || this.char === CTRL_J) {
            return this.next(this.parseMultiTrim);
          } else {
            throw this.error(new TomlError("Can't escape whitespace"));
          }
        }
        parseMultiTrim() {
          if (this.char === CTRL_J || this.char === CHAR_SP || this.char === CTRL_I || this.char === CTRL_M) {
            return null;
          } else {
            return this.returnNow();
          }
        }
        parseEscape() {
          if (this.char in escapes) {
            return this.return(escapes[this.char]);
          } else if (this.char === CHAR_u) {
            return this.call(this.parseSmallUnicode, this.parseUnicodeReturn);
          } else if (this.char === CHAR_U) {
            return this.call(this.parseLargeUnicode, this.parseUnicodeReturn);
          } else {
            throw this.error(new TomlError("Unknown escape character: " + this.char));
          }
        }
        parseUnicodeReturn(char) {
          try {
            const codePoint = parseInt(char, 16);
            if (codePoint >= SURROGATE_FIRST && codePoint <= SURROGATE_LAST) {
              throw this.error(new TomlError("Invalid unicode, character in range 0xD800 - 0xDFFF is reserved"));
            }
            return this.returnNow(String.fromCodePoint(codePoint));
          } catch (err) {
            throw this.error(TomlError.wrap(err));
          }
        }
        parseSmallUnicode() {
          if (!isHexit(this.char)) {
            throw this.error(new TomlError("Invalid character in unicode sequence, expected hex"));
          } else {
            this.consume();
            if (this.state.buf.length >= 4) return this.return();
          }
        }
        parseLargeUnicode() {
          if (!isHexit(this.char)) {
            throw this.error(new TomlError("Invalid character in unicode sequence, expected hex"));
          } else {
            this.consume();
            if (this.state.buf.length >= 8) return this.return();
          }
        }
        /* NUMBERS */
        parseNumberSign() {
          this.consume();
          return this.next(this.parseMaybeSignedInfOrNan);
        }
        parseMaybeSignedInfOrNan() {
          if (this.char === CHAR_i) {
            return this.next(this.parseInf);
          } else if (this.char === CHAR_n) {
            return this.next(this.parseNan);
          } else {
            return this.callNow(this.parseNoUnder, this.parseNumberIntegerStart);
          }
        }
        parseNumberIntegerStart() {
          if (this.char === CHAR_0) {
            this.consume();
            return this.next(this.parseNumberIntegerExponentOrDecimal);
          } else {
            return this.goto(this.parseNumberInteger);
          }
        }
        parseNumberIntegerExponentOrDecimal() {
          if (this.char === CHAR_PERIOD) {
            this.consume();
            return this.call(this.parseNoUnder, this.parseNumberFloat);
          } else if (this.char === CHAR_E || this.char === CHAR_e) {
            this.consume();
            return this.next(this.parseNumberExponentSign);
          } else {
            return this.returnNow(Integer(this.state.buf));
          }
        }
        parseNumberInteger() {
          if (isDigit(this.char)) {
            this.consume();
          } else if (this.char === CHAR_LOWBAR) {
            return this.call(this.parseNoUnder);
          } else if (this.char === CHAR_E || this.char === CHAR_e) {
            this.consume();
            return this.next(this.parseNumberExponentSign);
          } else if (this.char === CHAR_PERIOD) {
            this.consume();
            return this.call(this.parseNoUnder, this.parseNumberFloat);
          } else {
            const result = Integer(this.state.buf);
            if (result.isNaN()) {
              throw this.error(new TomlError("Invalid number"));
            } else {
              return this.returnNow(result);
            }
          }
        }
        parseNoUnder() {
          if (this.char === CHAR_LOWBAR || this.char === CHAR_PERIOD || this.char === CHAR_E || this.char === CHAR_e) {
            throw this.error(new TomlError("Unexpected character, expected digit"));
          } else if (this.atEndOfWord()) {
            throw this.error(new TomlError("Incomplete number"));
          }
          return this.returnNow();
        }
        parseNoUnderHexOctBinLiteral() {
          if (this.char === CHAR_LOWBAR || this.char === CHAR_PERIOD) {
            throw this.error(new TomlError("Unexpected character, expected digit"));
          } else if (this.atEndOfWord()) {
            throw this.error(new TomlError("Incomplete number"));
          }
          return this.returnNow();
        }
        parseNumberFloat() {
          if (this.char === CHAR_LOWBAR) {
            return this.call(this.parseNoUnder, this.parseNumberFloat);
          } else if (isDigit(this.char)) {
            this.consume();
          } else if (this.char === CHAR_E || this.char === CHAR_e) {
            this.consume();
            return this.next(this.parseNumberExponentSign);
          } else {
            return this.returnNow(Float(this.state.buf));
          }
        }
        parseNumberExponentSign() {
          if (isDigit(this.char)) {
            return this.goto(this.parseNumberExponent);
          } else if (this.char === CHAR_HYPHEN || this.char === CHAR_PLUS) {
            this.consume();
            this.call(this.parseNoUnder, this.parseNumberExponent);
          } else {
            throw this.error(new TomlError("Unexpected character, expected -, + or digit"));
          }
        }
        parseNumberExponent() {
          if (isDigit(this.char)) {
            this.consume();
          } else if (this.char === CHAR_LOWBAR) {
            return this.call(this.parseNoUnder);
          } else {
            return this.returnNow(Float(this.state.buf));
          }
        }
        /* NUMBERS or DATETIMES  */
        parseNumberOrDateTime() {
          if (this.char === CHAR_0) {
            this.consume();
            return this.next(this.parseNumberBaseOrDateTime);
          } else {
            return this.goto(this.parseNumberOrDateTimeOnly);
          }
        }
        parseNumberOrDateTimeOnly() {
          if (this.char === CHAR_LOWBAR) {
            return this.call(this.parseNoUnder, this.parseNumberInteger);
          } else if (isDigit(this.char)) {
            this.consume();
            if (this.state.buf.length > 4) this.next(this.parseNumberInteger);
          } else if (this.char === CHAR_E || this.char === CHAR_e) {
            this.consume();
            return this.next(this.parseNumberExponentSign);
          } else if (this.char === CHAR_PERIOD) {
            this.consume();
            return this.call(this.parseNoUnder, this.parseNumberFloat);
          } else if (this.char === CHAR_HYPHEN) {
            return this.goto(this.parseDateTime);
          } else if (this.char === CHAR_COLON) {
            return this.goto(this.parseOnlyTimeHour);
          } else {
            return this.returnNow(Integer(this.state.buf));
          }
        }
        parseDateTimeOnly() {
          if (this.state.buf.length < 4) {
            if (isDigit(this.char)) {
              return this.consume();
            } else if (this.char === CHAR_COLON) {
              return this.goto(this.parseOnlyTimeHour);
            } else {
              throw this.error(new TomlError("Expected digit while parsing year part of a date"));
            }
          } else {
            if (this.char === CHAR_HYPHEN) {
              return this.goto(this.parseDateTime);
            } else {
              throw this.error(new TomlError("Expected hyphen (-) while parsing year part of date"));
            }
          }
        }
        parseNumberBaseOrDateTime() {
          if (this.char === CHAR_b) {
            this.consume();
            return this.call(this.parseNoUnderHexOctBinLiteral, this.parseIntegerBin);
          } else if (this.char === CHAR_o) {
            this.consume();
            return this.call(this.parseNoUnderHexOctBinLiteral, this.parseIntegerOct);
          } else if (this.char === CHAR_x) {
            this.consume();
            return this.call(this.parseNoUnderHexOctBinLiteral, this.parseIntegerHex);
          } else if (this.char === CHAR_PERIOD) {
            return this.goto(this.parseNumberInteger);
          } else if (isDigit(this.char)) {
            return this.goto(this.parseDateTimeOnly);
          } else {
            return this.returnNow(Integer(this.state.buf));
          }
        }
        parseIntegerHex() {
          if (isHexit(this.char)) {
            this.consume();
          } else if (this.char === CHAR_LOWBAR) {
            return this.call(this.parseNoUnderHexOctBinLiteral);
          } else {
            const result = Integer(this.state.buf);
            if (result.isNaN()) {
              throw this.error(new TomlError("Invalid number"));
            } else {
              return this.returnNow(result);
            }
          }
        }
        parseIntegerOct() {
          if (isOctit(this.char)) {
            this.consume();
          } else if (this.char === CHAR_LOWBAR) {
            return this.call(this.parseNoUnderHexOctBinLiteral);
          } else {
            const result = Integer(this.state.buf);
            if (result.isNaN()) {
              throw this.error(new TomlError("Invalid number"));
            } else {
              return this.returnNow(result);
            }
          }
        }
        parseIntegerBin() {
          if (isBit(this.char)) {
            this.consume();
          } else if (this.char === CHAR_LOWBAR) {
            return this.call(this.parseNoUnderHexOctBinLiteral);
          } else {
            const result = Integer(this.state.buf);
            if (result.isNaN()) {
              throw this.error(new TomlError("Invalid number"));
            } else {
              return this.returnNow(result);
            }
          }
        }
        /* DATETIME */
        parseDateTime() {
          if (this.state.buf.length < 4) {
            throw this.error(new TomlError("Years less than 1000 must be zero padded to four characters"));
          }
          this.state.result = this.state.buf;
          this.state.buf = "";
          return this.next(this.parseDateMonth);
        }
        parseDateMonth() {
          if (this.char === CHAR_HYPHEN) {
            if (this.state.buf.length < 2) {
              throw this.error(new TomlError("Months less than 10 must be zero padded to two characters"));
            }
            this.state.result += "-" + this.state.buf;
            this.state.buf = "";
            return this.next(this.parseDateDay);
          } else if (isDigit(this.char)) {
            this.consume();
          } else {
            throw this.error(new TomlError("Incomplete datetime"));
          }
        }
        parseDateDay() {
          if (this.char === CHAR_T || this.char === CHAR_SP) {
            if (this.state.buf.length < 2) {
              throw this.error(new TomlError("Days less than 10 must be zero padded to two characters"));
            }
            this.state.result += "-" + this.state.buf;
            this.state.buf = "";
            return this.next(this.parseStartTimeHour);
          } else if (this.atEndOfWord()) {
            return this.returnNow(createDate(this.state.result + "-" + this.state.buf));
          } else if (isDigit(this.char)) {
            this.consume();
          } else {
            throw this.error(new TomlError("Incomplete datetime"));
          }
        }
        parseStartTimeHour() {
          if (this.atEndOfWord()) {
            return this.returnNow(createDate(this.state.result));
          } else {
            return this.goto(this.parseTimeHour);
          }
        }
        parseTimeHour() {
          if (this.char === CHAR_COLON) {
            if (this.state.buf.length < 2) {
              throw this.error(new TomlError("Hours less than 10 must be zero padded to two characters"));
            }
            this.state.result += "T" + this.state.buf;
            this.state.buf = "";
            return this.next(this.parseTimeMin);
          } else if (isDigit(this.char)) {
            this.consume();
          } else {
            throw this.error(new TomlError("Incomplete datetime"));
          }
        }
        parseTimeMin() {
          if (this.state.buf.length < 2 && isDigit(this.char)) {
            this.consume();
          } else if (this.state.buf.length === 2 && this.char === CHAR_COLON) {
            this.state.result += ":" + this.state.buf;
            this.state.buf = "";
            return this.next(this.parseTimeSec);
          } else {
            throw this.error(new TomlError("Incomplete datetime"));
          }
        }
        parseTimeSec() {
          if (isDigit(this.char)) {
            this.consume();
            if (this.state.buf.length === 2) {
              this.state.result += ":" + this.state.buf;
              this.state.buf = "";
              return this.next(this.parseTimeZoneOrFraction);
            }
          } else {
            throw this.error(new TomlError("Incomplete datetime"));
          }
        }
        parseOnlyTimeHour() {
          if (this.char === CHAR_COLON) {
            if (this.state.buf.length < 2) {
              throw this.error(new TomlError("Hours less than 10 must be zero padded to two characters"));
            }
            this.state.result = this.state.buf;
            this.state.buf = "";
            return this.next(this.parseOnlyTimeMin);
          } else {
            throw this.error(new TomlError("Incomplete time"));
          }
        }
        parseOnlyTimeMin() {
          if (this.state.buf.length < 2 && isDigit(this.char)) {
            this.consume();
          } else if (this.state.buf.length === 2 && this.char === CHAR_COLON) {
            this.state.result += ":" + this.state.buf;
            this.state.buf = "";
            return this.next(this.parseOnlyTimeSec);
          } else {
            throw this.error(new TomlError("Incomplete time"));
          }
        }
        parseOnlyTimeSec() {
          if (isDigit(this.char)) {
            this.consume();
            if (this.state.buf.length === 2) {
              return this.next(this.parseOnlyTimeFractionMaybe);
            }
          } else {
            throw this.error(new TomlError("Incomplete time"));
          }
        }
        parseOnlyTimeFractionMaybe() {
          this.state.result += ":" + this.state.buf;
          if (this.char === CHAR_PERIOD) {
            this.state.buf = "";
            this.next(this.parseOnlyTimeFraction);
          } else {
            return this.return(createTime(this.state.result));
          }
        }
        parseOnlyTimeFraction() {
          if (isDigit(this.char)) {
            this.consume();
          } else if (this.atEndOfWord()) {
            if (this.state.buf.length === 0) throw this.error(new TomlError("Expected digit in milliseconds"));
            return this.returnNow(createTime(this.state.result + "." + this.state.buf));
          } else {
            throw this.error(new TomlError("Unexpected character in datetime, expected period (.), minus (-), plus (+) or Z"));
          }
        }
        parseTimeZoneOrFraction() {
          if (this.char === CHAR_PERIOD) {
            this.consume();
            this.next(this.parseDateTimeFraction);
          } else if (this.char === CHAR_HYPHEN || this.char === CHAR_PLUS) {
            this.consume();
            this.next(this.parseTimeZoneHour);
          } else if (this.char === CHAR_Z) {
            this.consume();
            return this.return(createDateTime(this.state.result + this.state.buf));
          } else if (this.atEndOfWord()) {
            return this.returnNow(createDateTimeFloat(this.state.result + this.state.buf));
          } else {
            throw this.error(new TomlError("Unexpected character in datetime, expected period (.), minus (-), plus (+) or Z"));
          }
        }
        parseDateTimeFraction() {
          if (isDigit(this.char)) {
            this.consume();
          } else if (this.state.buf.length === 1) {
            throw this.error(new TomlError("Expected digit in milliseconds"));
          } else if (this.char === CHAR_HYPHEN || this.char === CHAR_PLUS) {
            this.consume();
            this.next(this.parseTimeZoneHour);
          } else if (this.char === CHAR_Z) {
            this.consume();
            return this.return(createDateTime(this.state.result + this.state.buf));
          } else if (this.atEndOfWord()) {
            return this.returnNow(createDateTimeFloat(this.state.result + this.state.buf));
          } else {
            throw this.error(new TomlError("Unexpected character in datetime, expected period (.), minus (-), plus (+) or Z"));
          }
        }
        parseTimeZoneHour() {
          if (isDigit(this.char)) {
            this.consume();
            if (/\d\d$/.test(this.state.buf)) return this.next(this.parseTimeZoneSep);
          } else {
            throw this.error(new TomlError("Unexpected character in datetime, expected digit"));
          }
        }
        parseTimeZoneSep() {
          if (this.char === CHAR_COLON) {
            this.consume();
            this.next(this.parseTimeZoneMin);
          } else {
            throw this.error(new TomlError("Unexpected character in datetime, expected colon"));
          }
        }
        parseTimeZoneMin() {
          if (isDigit(this.char)) {
            this.consume();
            if (/\d\d$/.test(this.state.buf)) return this.return(createDateTime(this.state.result + this.state.buf));
          } else {
            throw this.error(new TomlError("Unexpected character in datetime, expected digit"));
          }
        }
        /* BOOLEAN */
        parseBoolean() {
          if (this.char === CHAR_t) {
            this.consume();
            return this.next(this.parseTrue_r);
          } else if (this.char === CHAR_f) {
            this.consume();
            return this.next(this.parseFalse_a);
          }
        }
        parseTrue_r() {
          if (this.char === CHAR_r) {
            this.consume();
            return this.next(this.parseTrue_u);
          } else {
            throw this.error(new TomlError("Invalid boolean, expected true or false"));
          }
        }
        parseTrue_u() {
          if (this.char === CHAR_u) {
            this.consume();
            return this.next(this.parseTrue_e);
          } else {
            throw this.error(new TomlError("Invalid boolean, expected true or false"));
          }
        }
        parseTrue_e() {
          if (this.char === CHAR_e) {
            return this.return(true);
          } else {
            throw this.error(new TomlError("Invalid boolean, expected true or false"));
          }
        }
        parseFalse_a() {
          if (this.char === CHAR_a) {
            this.consume();
            return this.next(this.parseFalse_l);
          } else {
            throw this.error(new TomlError("Invalid boolean, expected true or false"));
          }
        }
        parseFalse_l() {
          if (this.char === CHAR_l) {
            this.consume();
            return this.next(this.parseFalse_s);
          } else {
            throw this.error(new TomlError("Invalid boolean, expected true or false"));
          }
        }
        parseFalse_s() {
          if (this.char === CHAR_s) {
            this.consume();
            return this.next(this.parseFalse_e);
          } else {
            throw this.error(new TomlError("Invalid boolean, expected true or false"));
          }
        }
        parseFalse_e() {
          if (this.char === CHAR_e) {
            return this.return(false);
          } else {
            throw this.error(new TomlError("Invalid boolean, expected true or false"));
          }
        }
        /* INLINE LISTS */
        parseInlineList() {
          if (this.char === CHAR_SP || this.char === CTRL_I || this.char === CTRL_M || this.char === CTRL_J) {
            return null;
          } else if (this.char === Parser.END) {
            throw this.error(new TomlError("Unterminated inline array"));
          } else if (this.char === CHAR_NUM) {
            return this.call(this.parseComment);
          } else if (this.char === CHAR_RSQB) {
            return this.return(this.state.resultArr || InlineList());
          } else {
            return this.callNow(this.parseValue, this.recordInlineListValue);
          }
        }
        recordInlineListValue(value) {
          if (this.state.resultArr) {
            const listType = this.state.resultArr[_contentType];
            const valueType = tomlType(value);
            if (listType !== valueType) {
              throw this.error(new TomlError(`Inline lists must be a single type, not a mix of ${listType} and ${valueType}`));
            }
          } else {
            this.state.resultArr = InlineList(tomlType(value));
          }
          if (isFloat(value) || isInteger(value)) {
            this.state.resultArr.push(value.valueOf());
          } else {
            this.state.resultArr.push(value);
          }
          return this.goto(this.parseInlineListNext);
        }
        parseInlineListNext() {
          if (this.char === CHAR_SP || this.char === CTRL_I || this.char === CTRL_M || this.char === CTRL_J) {
            return null;
          } else if (this.char === CHAR_NUM) {
            return this.call(this.parseComment);
          } else if (this.char === CHAR_COMMA) {
            return this.next(this.parseInlineList);
          } else if (this.char === CHAR_RSQB) {
            return this.goto(this.parseInlineList);
          } else {
            throw this.error(new TomlError("Invalid character, expected whitespace, comma (,) or close bracket (])"));
          }
        }
        /* INLINE TABLE */
        parseInlineTable() {
          if (this.char === CHAR_SP || this.char === CTRL_I) {
            return null;
          } else if (this.char === Parser.END || this.char === CHAR_NUM || this.char === CTRL_J || this.char === CTRL_M) {
            throw this.error(new TomlError("Unterminated inline array"));
          } else if (this.char === CHAR_RCUB) {
            return this.return(this.state.resultTable || InlineTable());
          } else {
            if (!this.state.resultTable) this.state.resultTable = InlineTable();
            return this.callNow(this.parseAssign, this.recordInlineTableValue);
          }
        }
        recordInlineTableValue(kv) {
          let target = this.state.resultTable;
          let finalKey = kv.key.pop();
          for (let kw of kv.key) {
            if (hasKey(target, kw) && (!isTable(target[kw]) || target[kw][_declared])) {
              throw this.error(new TomlError("Can't redefine existing key"));
            }
            target = target[kw] = target[kw] || Table();
          }
          if (hasKey(target, finalKey)) {
            throw this.error(new TomlError("Can't redefine existing key"));
          }
          if (isInteger(kv.value) || isFloat(kv.value)) {
            target[finalKey] = kv.value.valueOf();
          } else {
            target[finalKey] = kv.value;
          }
          return this.goto(this.parseInlineTableNext);
        }
        parseInlineTableNext() {
          if (this.char === CHAR_SP || this.char === CTRL_I) {
            return null;
          } else if (this.char === Parser.END || this.char === CHAR_NUM || this.char === CTRL_J || this.char === CTRL_M) {
            throw this.error(new TomlError("Unterminated inline array"));
          } else if (this.char === CHAR_COMMA) {
            return this.next(this.parseInlineTable);
          } else if (this.char === CHAR_RCUB) {
            return this.goto(this.parseInlineTable);
          } else {
            throw this.error(new TomlError("Invalid character, expected whitespace, comma (,) or close bracket (])"));
          }
        }
      }
      return TOMLParser;
    }
  }
});

// node_modules/@iarna/toml/parse-pretty-error.js
var require_parse_pretty_error = __commonJS({
  "node_modules/@iarna/toml/parse-pretty-error.js"(exports2, module2) {
    "use strict";
    module2.exports = prettyError;
    function prettyError(err, buf) {
      if (err.pos == null || err.line == null) return err;
      let msg = err.message;
      msg += ` at row ${err.line + 1}, col ${err.col + 1}, pos ${err.pos}:
`;
      if (buf && buf.split) {
        const lines = buf.split(/\n/);
        const lineNumWidth = String(Math.min(lines.length, err.line + 3)).length;
        let linePadding = " ";
        while (linePadding.length < lineNumWidth) linePadding += " ";
        for (let ii = Math.max(0, err.line - 1); ii < Math.min(lines.length, err.line + 2); ++ii) {
          let lineNum = String(ii + 1);
          if (lineNum.length < lineNumWidth) lineNum = " " + lineNum;
          if (err.line === ii) {
            msg += lineNum + "> " + lines[ii] + "\n";
            msg += linePadding + "  ";
            for (let hh = 0; hh < err.col; ++hh) {
              msg += " ";
            }
            msg += "^\n";
          } else {
            msg += lineNum + ": " + lines[ii] + "\n";
          }
        }
      }
      err.message = msg + "\n";
      return err;
    }
  }
});

// node_modules/@iarna/toml/parse-string.js
var require_parse_string = __commonJS({
  "node_modules/@iarna/toml/parse-string.js"(exports2, module2) {
    "use strict";
    module2.exports = parseString;
    var TOMLParser = require_toml_parser();
    var prettyError = require_parse_pretty_error();
    function parseString(str) {
      if (global.Buffer && global.Buffer.isBuffer(str)) {
        str = str.toString("utf8");
      }
      const parser = new TOMLParser();
      try {
        parser.parse(str);
        return parser.finish();
      } catch (err) {
        throw prettyError(err, str);
      }
    }
  }
});

// node_modules/@iarna/toml/parse-async.js
var require_parse_async = __commonJS({
  "node_modules/@iarna/toml/parse-async.js"(exports2, module2) {
    "use strict";
    module2.exports = parseAsync;
    var TOMLParser = require_toml_parser();
    var prettyError = require_parse_pretty_error();
    function parseAsync(str, opts) {
      if (!opts) opts = {};
      const index = 0;
      const blocksize = opts.blocksize || 40960;
      const parser = new TOMLParser();
      return new Promise((resolve2, reject) => {
        setImmediate(parseAsyncNext, index, blocksize, resolve2, reject);
      });
      function parseAsyncNext(index2, blocksize2, resolve2, reject) {
        if (index2 >= str.length) {
          try {
            return resolve2(parser.finish());
          } catch (err) {
            return reject(prettyError(err, str));
          }
        }
        try {
          parser.parse(str.slice(index2, index2 + blocksize2));
          setImmediate(parseAsyncNext, index2 + blocksize2, blocksize2, resolve2, reject);
        } catch (err) {
          reject(prettyError(err, str));
        }
      }
    }
  }
});

// node_modules/@iarna/toml/parse-stream.js
var require_parse_stream = __commonJS({
  "node_modules/@iarna/toml/parse-stream.js"(exports2, module2) {
    "use strict";
    module2.exports = parseStream;
    var stream = require("stream");
    var TOMLParser = require_toml_parser();
    function parseStream(stm) {
      if (stm) {
        return parseReadable(stm);
      } else {
        return parseTransform(stm);
      }
    }
    function parseReadable(stm) {
      const parser = new TOMLParser();
      stm.setEncoding("utf8");
      return new Promise((resolve2, reject) => {
        let readable;
        let ended = false;
        let errored = false;
        function finish() {
          ended = true;
          if (readable) return;
          try {
            resolve2(parser.finish());
          } catch (err) {
            reject(err);
          }
        }
        function error(err) {
          errored = true;
          reject(err);
        }
        stm.once("end", finish);
        stm.once("error", error);
        readNext();
        function readNext() {
          readable = true;
          let data;
          while ((data = stm.read()) !== null) {
            try {
              parser.parse(data);
            } catch (err) {
              return error(err);
            }
          }
          readable = false;
          if (ended) return finish();
          if (errored) return;
          stm.once("readable", readNext);
        }
      });
    }
    function parseTransform() {
      const parser = new TOMLParser();
      return new stream.Transform({
        objectMode: true,
        transform(chunk, encoding, cb) {
          try {
            parser.parse(chunk.toString(encoding));
          } catch (err) {
            this.emit("error", err);
          }
          cb();
        },
        flush(cb) {
          try {
            this.push(parser.finish());
          } catch (err) {
            this.emit("error", err);
          }
          cb();
        }
      });
    }
  }
});

// node_modules/@iarna/toml/parse.js
var require_parse = __commonJS({
  "node_modules/@iarna/toml/parse.js"(exports2, module2) {
    "use strict";
    module2.exports = require_parse_string();
    module2.exports.async = require_parse_async();
    module2.exports.stream = require_parse_stream();
    module2.exports.prettyError = require_parse_pretty_error();
  }
});

// node_modules/@iarna/toml/stringify.js
var require_stringify = __commonJS({
  "node_modules/@iarna/toml/stringify.js"(exports2, module2) {
    "use strict";
    module2.exports = stringify;
    module2.exports.value = stringifyInline;
    function stringify(obj) {
      if (obj === null) throw typeError("null");
      if (obj === void 0) throw typeError("undefined");
      if (typeof obj !== "object") throw typeError(typeof obj);
      if (typeof obj.toJSON === "function") obj = obj.toJSON();
      if (obj == null) return null;
      const type = tomlType2(obj);
      if (type !== "table") throw typeError(type);
      return stringifyObject("", "", obj);
    }
    function typeError(type) {
      return new Error("Can only stringify objects, not " + type);
    }
    function arrayOneTypeError() {
      return new Error("Array values can't have mixed types");
    }
    function getInlineKeys(obj) {
      return Object.keys(obj).filter((key) => isInline(obj[key]));
    }
    function getComplexKeys(obj) {
      return Object.keys(obj).filter((key) => !isInline(obj[key]));
    }
    function toJSON(obj) {
      let nobj = Array.isArray(obj) ? [] : Object.prototype.hasOwnProperty.call(obj, "__proto__") ? { ["__proto__"]: void 0 } : {};
      for (let prop of Object.keys(obj)) {
        if (obj[prop] && typeof obj[prop].toJSON === "function" && !("toISOString" in obj[prop])) {
          nobj[prop] = obj[prop].toJSON();
        } else {
          nobj[prop] = obj[prop];
        }
      }
      return nobj;
    }
    function stringifyObject(prefix, indent, obj) {
      obj = toJSON(obj);
      var inlineKeys;
      var complexKeys;
      inlineKeys = getInlineKeys(obj);
      complexKeys = getComplexKeys(obj);
      var result = [];
      var inlineIndent = indent || "";
      inlineKeys.forEach((key) => {
        var type = tomlType2(obj[key]);
        if (type !== "undefined" && type !== "null") {
          result.push(inlineIndent + stringifyKey(key) + " = " + stringifyAnyInline(obj[key], true));
        }
      });
      if (result.length > 0) result.push("");
      var complexIndent = prefix && inlineKeys.length > 0 ? indent + "  " : "";
      complexKeys.forEach((key) => {
        result.push(stringifyComplex(prefix, complexIndent, key, obj[key]));
      });
      return result.join("\n");
    }
    function isInline(value) {
      switch (tomlType2(value)) {
        case "undefined":
        case "null":
        case "integer":
        case "nan":
        case "float":
        case "boolean":
        case "string":
        case "datetime":
          return true;
        case "array":
          return value.length === 0 || tomlType2(value[0]) !== "table";
        case "table":
          return Object.keys(value).length === 0;
        /* istanbul ignore next */
        default:
          return false;
      }
    }
    function tomlType2(value) {
      if (value === void 0) {
        return "undefined";
      } else if (value === null) {
        return "null";
      } else if (typeof value === "bigint" || Number.isInteger(value) && !Object.is(value, -0)) {
        return "integer";
      } else if (typeof value === "number") {
        return "float";
      } else if (typeof value === "boolean") {
        return "boolean";
      } else if (typeof value === "string") {
        return "string";
      } else if ("toISOString" in value) {
        return isNaN(value) ? "undefined" : "datetime";
      } else if (Array.isArray(value)) {
        return "array";
      } else {
        return "table";
      }
    }
    function stringifyKey(key) {
      var keyStr = String(key);
      if (/^[-A-Za-z0-9_]+$/.test(keyStr)) {
        return keyStr;
      } else {
        return stringifyBasicString(keyStr);
      }
    }
    function stringifyBasicString(str) {
      return '"' + escapeString(str).replace(/"/g, '\\"') + '"';
    }
    function stringifyLiteralString(str) {
      return "'" + str + "'";
    }
    function numpad(num, str) {
      while (str.length < num) str = "0" + str;
      return str;
    }
    function escapeString(str) {
      return str.replace(/\\/g, "\\\\").replace(/[\b]/g, "\\b").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\f/g, "\\f").replace(/\r/g, "\\r").replace(/([\u0000-\u001f\u007f])/, (c) => "\\u" + numpad(4, c.codePointAt(0).toString(16)));
    }
    function stringifyMultilineString(str) {
      let escaped = str.split(/\n/).map((str2) => {
        return escapeString(str2).replace(/"(?="")/g, '\\"');
      }).join("\n");
      if (escaped.slice(-1) === '"') escaped += "\\\n";
      return '"""\n' + escaped + '"""';
    }
    function stringifyAnyInline(value, multilineOk) {
      let type = tomlType2(value);
      if (type === "string") {
        if (multilineOk && /\n/.test(value)) {
          type = "string-multiline";
        } else if (!/[\b\t\n\f\r']/.test(value) && /"/.test(value)) {
          type = "string-literal";
        }
      }
      return stringifyInline(value, type);
    }
    function stringifyInline(value, type) {
      if (!type) type = tomlType2(value);
      switch (type) {
        case "string-multiline":
          return stringifyMultilineString(value);
        case "string":
          return stringifyBasicString(value);
        case "string-literal":
          return stringifyLiteralString(value);
        case "integer":
          return stringifyInteger(value);
        case "float":
          return stringifyFloat(value);
        case "boolean":
          return stringifyBoolean(value);
        case "datetime":
          return stringifyDatetime(value);
        case "array":
          return stringifyInlineArray(value.filter((_) => tomlType2(_) !== "null" && tomlType2(_) !== "undefined" && tomlType2(_) !== "nan"));
        case "table":
          return stringifyInlineTable(value);
        /* istanbul ignore next */
        default:
          throw typeError(type);
      }
    }
    function stringifyInteger(value) {
      return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, "_");
    }
    function stringifyFloat(value) {
      if (value === Infinity) {
        return "inf";
      } else if (value === -Infinity) {
        return "-inf";
      } else if (Object.is(value, NaN)) {
        return "nan";
      } else if (Object.is(value, -0)) {
        return "-0.0";
      }
      var chunks = String(value).split(".");
      var int = chunks[0];
      var dec = chunks[1] || 0;
      return stringifyInteger(int) + "." + dec;
    }
    function stringifyBoolean(value) {
      return String(value);
    }
    function stringifyDatetime(value) {
      return value.toISOString();
    }
    function isNumber(type) {
      return type === "float" || type === "integer";
    }
    function arrayType(values) {
      var contentType = tomlType2(values[0]);
      if (values.every((_) => tomlType2(_) === contentType)) return contentType;
      if (values.every((_) => isNumber(tomlType2(_)))) return "float";
      return "mixed";
    }
    function validateArray(values) {
      const type = arrayType(values);
      if (type === "mixed") {
        throw arrayOneTypeError();
      }
      return type;
    }
    function stringifyInlineArray(values) {
      values = toJSON(values);
      const type = validateArray(values);
      var result = "[";
      var stringified = values.map((_) => stringifyInline(_, type));
      if (stringified.join(", ").length > 60 || /\n/.test(stringified)) {
        result += "\n  " + stringified.join(",\n  ") + "\n";
      } else {
        result += " " + stringified.join(", ") + (stringified.length > 0 ? " " : "");
      }
      return result + "]";
    }
    function stringifyInlineTable(value) {
      value = toJSON(value);
      var result = [];
      Object.keys(value).forEach((key) => {
        result.push(stringifyKey(key) + " = " + stringifyAnyInline(value[key], false));
      });
      return "{ " + result.join(", ") + (result.length > 0 ? " " : "") + "}";
    }
    function stringifyComplex(prefix, indent, key, value) {
      var valueType = tomlType2(value);
      if (valueType === "array") {
        return stringifyArrayOfTables(prefix, indent, key, value);
      } else if (valueType === "table") {
        return stringifyComplexTable(prefix, indent, key, value);
      } else {
        throw typeError(valueType);
      }
    }
    function stringifyArrayOfTables(prefix, indent, key, values) {
      values = toJSON(values);
      validateArray(values);
      var firstValueType = tomlType2(values[0]);
      if (firstValueType !== "table") throw typeError(firstValueType);
      var fullKey = prefix + stringifyKey(key);
      var result = "";
      values.forEach((table) => {
        if (result.length > 0) result += "\n";
        result += indent + "[[" + fullKey + "]]\n";
        result += stringifyObject(fullKey + ".", indent, table);
      });
      return result;
    }
    function stringifyComplexTable(prefix, indent, key, value) {
      var fullKey = prefix + stringifyKey(key);
      var result = "";
      if (getInlineKeys(value).length > 0) {
        result += indent + "[" + fullKey + "]\n";
      }
      return result + stringifyObject(fullKey + ".", indent, value);
    }
  }
});

// node_modules/@iarna/toml/toml.js
var require_toml = __commonJS({
  "node_modules/@iarna/toml/toml.js"(exports2) {
    "use strict";
    exports2.parse = require_parse();
    exports2.stringify = require_stringify();
  }
});

// node_modules/toml-eslint-parser/lib/internal-utils/index.js
var require_internal_utils = __commonJS({
  "node_modules/toml-eslint-parser/lib/internal-utils/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.last = last;
    exports2.toKeyName = toKeyName;
    function last(arr) {
      var _a;
      return (_a = arr[arr.length - 1]) !== null && _a !== void 0 ? _a : null;
    }
    function toKeyName(node) {
      return node.type === "TOMLBare" ? node.name : node.value;
    }
  }
});

// node_modules/toml-eslint-parser/lib/parser-options.js
var require_parser_options = __commonJS({
  "node_modules/toml-eslint-parser/lib/parser-options.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getTOMLVer = getTOMLVer;
    var TOMLVerImpl = class {
      constructor(major, minor) {
        this.major = major;
        this.minor = minor;
      }
      lt(major, minor) {
        return this.major < major || this.major === major && this.minor < minor;
      }
      gte(major, minor) {
        return this.major > major || this.major === major && this.minor >= minor;
      }
    };
    var TOML_VERSION_1_0 = new TOMLVerImpl(1, 0);
    var TOML_VERSION_1_1 = new TOMLVerImpl(1, 1);
    var DEFAULT_TOML_VERSION = TOML_VERSION_1_0;
    var SUPPORTED_TOML_VERSIONS = {
      "1.0": TOML_VERSION_1_0,
      "1.0.0": TOML_VERSION_1_0,
      "1.1": TOML_VERSION_1_1,
      "1.1.0": TOML_VERSION_1_1,
      latest: TOML_VERSION_1_1,
      next: TOML_VERSION_1_1
    };
    function getTOMLVer(v) {
      return v && SUPPORTED_TOML_VERSIONS[v] || DEFAULT_TOML_VERSION;
    }
  }
});

// node_modules/toml-eslint-parser/lib/errors.js
var require_errors = __commonJS({
  "node_modules/toml-eslint-parser/lib/errors.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ParseError = void 0;
    var MESSAGES = {
      "unterminated-string": "Unterminated string constant",
      "unterminated-table-key": "Unterminated table-key",
      "unterminated-array": "Unterminated array",
      "unterminated-inline-table": "Unterminated inline table",
      "missing-key": "Empty bare keys are not allowed",
      "missing-newline": "Must be a newline",
      "missing-equals-sign": "Expected equal (=) token",
      "missing-value": "Unspecified values are invalid",
      "missing-comma": "Expected comma (,) token",
      "dupe-keys": "Defining a key multiple times is invalid",
      "unexpected-char": "Unexpected character",
      "unexpected-token": "Unexpected token",
      "invalid-control-character": "Control characters (codes < 0x1f and 0x7f) are not allowed",
      "invalid-comment-character": "Invalid code point {{cp}} within comments",
      "invalid-key-value-newline": "The key, equals sign, and value must be on the same line",
      "invalid-inline-table-newline": "No newlines are allowed between the curly braces unless they are valid within a value",
      "invalid-underscore": "Underscores are allowed between digits",
      "invalid-space": "Unexpected spaces",
      "invalid-three-quotes": "Three or more quotes are not permitted",
      "invalid-date": "Unexpected invalid date",
      "invalid-time": "Unexpected invalid time",
      "invalid-leading-zero": "Leading zeros are not allowed",
      "invalid-trailing-comma-in-inline-table": "Trailing comma is not permitted in an inline table",
      "invalid-char-in-escape-sequence": "Invalid character in escape sequence",
      "invalid-consecutive-dots-in-key": "Consecutive dots are not permitted in keys",
      "invalid-code-point": "Invalid code point {{cp}}",
      "invalid-trailing-dot-in-key": "Keys cannot end with a dot",
      "invalid-leading-dot-in-key": "Keys cannot start with a dot"
    };
    function getMessage(code, data) {
      if (data) {
        return MESSAGES[code].replace(/\{\{(.*?)\}\}/gu, (_, name) => {
          if (name in data) {
            return data[name];
          }
          return `{{${name}}}`;
        });
      }
      return MESSAGES[code];
    }
    var ParseError = class extends SyntaxError {
      /**
       * Initialize this ParseError instance.
       *
       */
      constructor(code, offset, line, column, data) {
        super(getMessage(code, data));
        this.index = offset;
        this.lineNumber = line;
        this.column = column;
      }
    };
    exports2.ParseError = ParseError;
  }
});

// node_modules/toml-eslint-parser/lib/tokenizer/locs.js
var require_locs = __commonJS({
  "node_modules/toml-eslint-parser/lib/tokenizer/locs.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Locations = void 0;
    function sortedLastIndex(array, value) {
      let low = 0;
      let high = array.length;
      while (low < high) {
        const mid = low + high >>> 1;
        const val = array[mid];
        if (val === value)
          return mid + 1;
        if (val < value) {
          low = mid + 1;
        } else {
          high = mid;
        }
      }
      return low;
    }
    var Locations = class {
      constructor() {
        this.offsets = [];
      }
      addOffset(offset) {
        for (let i = this.offsets.length - 1; i >= 0; i--) {
          const element = this.offsets[i];
          if (element === offset)
            return;
          if (element < offset)
            break;
        }
        this.offsets.push(offset);
      }
      /**
       * Calculate the location of the given index.
       * @param index The index to calculate their location.
       * @returns The location of the index.
       */
      getLocFromIndex(offset) {
        const line = sortedLastIndex(this.offsets, offset) + 1;
        const column = offset - (line === 1 ? 0 : this.offsets[line - 2]);
        return { line, column };
      }
    };
    exports2.Locations = Locations;
  }
});

// node_modules/toml-eslint-parser/lib/tokenizer/code-point-iterator.js
var require_code_point_iterator = __commonJS({
  "node_modules/toml-eslint-parser/lib/tokenizer/code-point-iterator.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CodePointIterator = void 0;
    var locs_1 = require_locs();
    var CodePointIterator = class {
      /**
       * Initialize this char iterator.
       */
      constructor(text) {
        this.locs = new locs_1.Locations();
        this.lastCodePoint = 0;
        this.start = -1;
        this.end = 0;
        this.text = text;
      }
      next() {
        if (this.lastCodePoint === -1) {
          return -1;
        }
        return this.lastCodePoint = this.moveAt(this.end);
      }
      getLocFromIndex(index) {
        return this.locs.getLocFromIndex(index);
      }
      eat(cp) {
        if (this.text.codePointAt(this.end) === cp) {
          this.next();
          return true;
        }
        return false;
      }
      moveAt(offset) {
        var _a;
        this.start = this.end = offset;
        const cp = (_a = this.text.codePointAt(this.start)) !== null && _a !== void 0 ? _a : -1;
        if (cp === -1) {
          this.end = this.start;
          return cp;
        }
        const shift = cp >= 65536 ? 2 : 1;
        this.end += shift;
        if (cp === 10) {
          this.locs.addOffset(this.end);
        } else if (cp === 13) {
          if (this.text.codePointAt(this.end) === 10) {
            this.end++;
            this.locs.addOffset(this.end);
          }
          return 10;
        }
        return cp;
      }
    };
    exports2.CodePointIterator = CodePointIterator;
  }
});

// node_modules/toml-eslint-parser/lib/tokenizer/code-point.js
var require_code_point = __commonJS({
  "node_modules/toml-eslint-parser/lib/tokenizer/code-point.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.isControl = isControl;
    exports2.isWhitespace = isWhitespace;
    exports2.isEOL = isEOL;
    exports2.isLetter = isLetter;
    exports2.isDigit = isDigit2;
    exports2.isHexDig = isHexDig;
    exports2.isOctalDig = isOctalDig;
    exports2.isHighSurrogate = isHighSurrogate;
    exports2.isLowSurrogate = isLowSurrogate;
    exports2.isUnicodeScalarValue = isUnicodeScalarValue;
    function isControl(cp) {
      return cp >= 0 && cp <= 31;
    }
    function isWhitespace(cp) {
      return cp === 9 || cp === 32;
    }
    function isEOL(cp) {
      return cp === 10 || cp === 13;
    }
    function isUpperLetter(cp) {
      return cp >= 65 && cp <= 90;
    }
    function isLowerLetter(cp) {
      return cp >= 97 && cp <= 122;
    }
    function isLetter(cp) {
      return isLowerLetter(cp) || isUpperLetter(cp);
    }
    function isDigit2(cp) {
      return cp >= 48 && cp <= 57;
    }
    function isHexDig(cp) {
      return isDigit2(cp) || cp >= 97 && cp <= 102 || cp >= 65 && cp <= 70;
    }
    function isOctalDig(cp) {
      return cp >= 48 && cp <= 55;
    }
    function isHighSurrogate(cp) {
      return cp >= 55296 && cp <= 57343;
    }
    function isLowSurrogate(cp) {
      return cp >= 56320 && cp <= 57343;
    }
    function isUnicodeScalarValue(cp) {
      return cp >= 0 && cp <= 55295 || cp >= 57344 && cp <= 1114111;
    }
  }
});

// node_modules/toml-eslint-parser/lib/tokenizer/tokenizer.js
var require_tokenizer = __commonJS({
  "node_modules/toml-eslint-parser/lib/tokenizer/tokenizer.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Tokenizer = void 0;
    var errors_1 = require_errors();
    var parser_options_1 = require_parser_options();
    var code_point_iterator_1 = require_code_point_iterator();
    var code_point_1 = require_code_point();
    var HAS_BIGINT = typeof BigInt !== "undefined";
    var RADIX_PREFIXES = {
      16: "0x",
      10: "",
      8: "0o",
      2: "0b"
    };
    var ESCAPES_1_0 = {
      // escape-seq-char =  %x22         ; "    quotation mark  U+0022
      [
        34
        /* CodePoint.QUOTATION_MARK */
      ]: 34,
      // escape-seq-char =/ %x5C         ; \    reverse solidus U+005C
      [
        92
        /* CodePoint.BACKSLASH */
      ]: 92,
      // escape-seq-char =/ %x62         ; b    backspace       U+0008
      [
        98
        /* CodePoint.LATIN_SMALL_B */
      ]: 8,
      // escape-seq-char =/ %x66         ; f    form feed       U+000C
      [
        102
        /* CodePoint.LATIN_SMALL_F */
      ]: 12,
      // escape-seq-char =/ %x6E         ; n    line feed       U+000A
      [
        110
        /* CodePoint.LATIN_SMALL_N */
      ]: 10,
      // escape-seq-char =/ %x72         ; r    carriage return U+000D
      [
        114
        /* CodePoint.LATIN_SMALL_R */
      ]: 13,
      // escape-seq-char =/ %x74         ; t    tab             U+0009
      [
        116
        /* CodePoint.LATIN_SMALL_T */
      ]: 9
    };
    var ESCAPES_LATEST = Object.assign(Object.assign({}, ESCAPES_1_0), {
      // escape-seq-char =/ %x65         ; e    escape          U+001B
      // Added in TOML 1.1
      [
        101
        /* CodePoint.LATIN_SMALL_E */
      ]: 27
      /* CodePoint.ESCAPE */
    });
    var Tokenizer = class {
      /**
       * Initialize this tokenizer.
       */
      constructor(text, parserOptions) {
        this.backCode = false;
        this.lastCodePoint = 0;
        this.state = "DATA";
        this.token = null;
        this.tokenStart = -1;
        this.valuesEnabled = false;
        this.text = text;
        this.parserOptions = parserOptions || {};
        this.codePointIterator = new code_point_iterator_1.CodePointIterator(text);
        this.tomlVersion = (0, parser_options_1.getTOMLVer)(this.parserOptions.tomlVersion);
        this.ESCAPES = this.tomlVersion.gte(1, 1) ? ESCAPES_LATEST : ESCAPES_1_0;
      }
      get start() {
        return this.codePointIterator.start;
      }
      get end() {
        return this.codePointIterator.end;
      }
      getLocFromIndex(index) {
        return this.codePointIterator.getLocFromIndex(index);
      }
      /**
       * Report an invalid character error.
       */
      reportParseError(code, data) {
        const offset = this.codePointIterator.start;
        const loc = this.codePointIterator.getLocFromIndex(offset);
        throw new errors_1.ParseError(code, offset, loc.line, loc.column, data);
      }
      /**
       * Get the next token.
       */
      nextToken() {
        let token = this.token;
        if (token != null) {
          this.token = null;
          return token;
        }
        let cp = this.lastCodePoint;
        while (cp !== -1 && !this.token) {
          cp = this.nextCode();
          const nextState = this[this.state](cp);
          if (!nextState) {
            throw new Error(`Unknown error: pre state=${this.state}`);
          }
          this.state = nextState;
        }
        token = this.token;
        this.token = null;
        return token;
      }
      /**
       * Get the next code point.
       */
      nextCode() {
        if (this.lastCodePoint === -1) {
          return -1;
        }
        if (this.backCode) {
          this.backCode = false;
          return this.lastCodePoint;
        }
        return this.lastCodePoint = this.codePointIterator.next();
      }
      /**
       * Eat the next code point.
       */
      eatCode(cp) {
        if (this.lastCodePoint === -1) {
          return false;
        }
        if (this.backCode) {
          if (this.lastCodePoint === cp) {
            this.backCode = false;
            return true;
          }
          return false;
        }
        return this.codePointIterator.eat(cp);
      }
      /**
       * Moves the character position to the given position.
       */
      moveAt(loc) {
        if (this.backCode) {
          this.backCode = false;
        }
        this.lastCodePoint = this.codePointIterator.moveAt(loc);
      }
      /**
       * Back the current code point as the given state.
       */
      back(state) {
        this.backCode = true;
        return state;
      }
      punctuatorToken() {
        this.startToken();
        this.endToken("Punctuator", "end");
      }
      startToken() {
        this.tokenStart = this.codePointIterator.start;
      }
      /**
       * Commit the current token.
       */
      endToken(type, pos, option1, option2) {
        const { tokenStart } = this;
        const end = this.codePointIterator[pos];
        const range = [tokenStart, end];
        const loc = {
          start: this.codePointIterator.getLocFromIndex(tokenStart),
          end: this.codePointIterator.getLocFromIndex(end)
        };
        if (type === "Block") {
          this.token = {
            type,
            value: this.text.slice(tokenStart + 1, end),
            range,
            loc
          };
        } else {
          let token;
          const value = this.text.slice(tokenStart, end);
          if (type === "BasicString" || type === "LiteralString" || type === "MultiLineBasicString" || type === "MultiLineLiteralString") {
            token = {
              type,
              value,
              string: option1,
              range,
              loc
            };
          } else if (type === "Integer") {
            const text = option1;
            token = {
              type,
              value,
              number: parseInt(text, option2),
              bigint: HAS_BIGINT ? BigInt(RADIX_PREFIXES[option2] + text) : null,
              range,
              loc
            };
          } else if (type === "Float") {
            token = {
              type,
              value,
              number: option1,
              range,
              loc
            };
          } else if (type === "Boolean") {
            token = {
              type,
              value,
              boolean: option1,
              range,
              loc
            };
          } else if (type === "LocalDate" || type === "LocalTime" || type === "LocalDateTime" || type === "OffsetDateTime") {
            token = {
              type,
              value,
              date: option1,
              range,
              loc
            };
          } else {
            token = {
              type,
              value,
              range,
              loc
            };
          }
          this.token = token;
        }
      }
      DATA(cp) {
        while ((0, code_point_1.isWhitespace)(cp) || (0, code_point_1.isEOL)(cp)) {
          cp = this.nextCode();
        }
        if (cp === 35) {
          this.startToken();
          return "COMMENT";
        }
        if (cp === 34) {
          this.startToken();
          return "BASIC_STRING";
        }
        if (cp === 39) {
          this.startToken();
          return "LITERAL_STRING";
        }
        if (cp === 46 || // .
        cp === 61 || // =
        cp === 91 || // [
        cp === 93 || // ]
        cp === 123 || // {
        cp === 125 || // }
        cp === 44) {
          this.punctuatorToken();
          return "DATA";
        }
        if (this.valuesEnabled) {
          if (cp === 45 || cp === 43) {
            this.startToken();
            return "SIGN";
          }
          if (cp === 110 || cp === 105) {
            this.startToken();
            return this.back("NAN_OR_INF");
          }
          if ((0, code_point_1.isDigit)(cp)) {
            this.startToken();
            return this.back("NUMBER");
          }
          if (cp === 116 || cp === 102) {
            this.startToken();
            return this.back("BOOLEAN");
          }
        } else {
          if (isUnquotedKeyChar(cp, this.tomlVersion)) {
            this.startToken();
            return "BARE";
          }
        }
        if (cp === -1) {
          return "DATA";
        }
        return this.reportParseError("unexpected-char");
      }
      COMMENT(cp) {
        const processCommentChar = this.tomlVersion.gte(1, 1) ? (c) => {
          if (!isNonEOL(c)) {
            this.reportParseError("invalid-comment-character", {
              cp: JSON.stringify(String.fromCodePoint(c)).slice(1, -1)
            });
          }
        } : (c) => {
          if (isControlOtherThanTab(c)) {
            this.reportParseErrorControlChar();
          }
        };
        while (!(0, code_point_1.isEOL)(cp) && cp !== -1) {
          processCommentChar(cp);
          cp = this.nextCode();
        }
        this.endToken("Block", "start");
        return "DATA";
      }
      BARE(cp) {
        while (isUnquotedKeyChar(cp, this.tomlVersion)) {
          cp = this.nextCode();
        }
        this.endToken("Bare", "start");
        return this.back("DATA");
      }
      BASIC_STRING(cp) {
        if (cp === 34) {
          cp = this.nextCode();
          if (cp === 34) {
            return "MULTI_LINE_BASIC_STRING";
          }
          this.endToken("BasicString", "start", "");
          return this.back("DATA");
        }
        const out = [];
        while (cp !== 34 && cp !== -1 && cp !== 10) {
          if (isControlOtherThanTab(cp)) {
            return this.reportParseErrorControlChar();
          }
          if (cp === 92) {
            cp = this.nextCode();
            const ecp = this.ESCAPES[cp];
            if (ecp) {
              out.push(ecp);
              cp = this.nextCode();
              continue;
            } else if (cp === 117) {
              const code = this.parseUnicode(4);
              out.push(code);
              cp = this.nextCode();
              continue;
            } else if (cp === 85) {
              const code = this.parseUnicode(8);
              out.push(code);
              cp = this.nextCode();
              continue;
            } else if (cp === 120 && this.tomlVersion.gte(1, 1)) {
              const code = this.parseUnicode(2);
              out.push(code);
              cp = this.nextCode();
              continue;
            }
            return this.reportParseError("invalid-char-in-escape-sequence");
          }
          out.push(cp);
          cp = this.nextCode();
        }
        if (cp !== 34) {
          return this.reportParseError("unterminated-string");
        }
        this.endToken("BasicString", "end", String.fromCodePoint(...out));
        return "DATA";
      }
      MULTI_LINE_BASIC_STRING(cp) {
        const out = [];
        if (cp === 10) {
          cp = this.nextCode();
        }
        while (cp !== -1) {
          if (cp !== 10 && isControlOtherThanTab(cp)) {
            return this.reportParseErrorControlChar();
          }
          if (cp === 34) {
            const startPos = this.codePointIterator.start;
            if (this.eatCode(
              34
              /* CodePoint.QUOTATION_MARK */
            ) && this.eatCode(
              34
              /* CodePoint.QUOTATION_MARK */
            )) {
              if (this.eatCode(
                34
                /* CodePoint.QUOTATION_MARK */
              )) {
                out.push(
                  34
                  /* CodePoint.QUOTATION_MARK */
                );
                if (this.eatCode(
                  34
                  /* CodePoint.QUOTATION_MARK */
                )) {
                  out.push(
                    34
                    /* CodePoint.QUOTATION_MARK */
                  );
                  if (this.eatCode(
                    34
                    /* CodePoint.QUOTATION_MARK */
                  )) {
                    this.moveAt(startPos);
                    return this.reportParseError("invalid-three-quotes");
                  }
                }
              }
              this.endToken("MultiLineBasicString", "end", String.fromCodePoint(...out));
              return "DATA";
            }
            this.moveAt(startPos);
          }
          if (cp === 92) {
            cp = this.nextCode();
            const ecp = this.ESCAPES[cp];
            if (ecp) {
              out.push(ecp);
              cp = this.nextCode();
              continue;
            } else if (cp === 117) {
              const code = this.parseUnicode(4);
              out.push(code);
              cp = this.nextCode();
              continue;
            } else if (cp === 85) {
              const code = this.parseUnicode(8);
              out.push(code);
              cp = this.nextCode();
              continue;
            } else if (cp === 120 && this.tomlVersion.gte(1, 1)) {
              const code = this.parseUnicode(2);
              out.push(code);
              cp = this.nextCode();
              continue;
            } else if (cp === 10) {
              cp = this.nextCode();
              while ((0, code_point_1.isWhitespace)(cp) || cp === 10) {
                cp = this.nextCode();
              }
              continue;
            } else if ((0, code_point_1.isWhitespace)(cp)) {
              let valid = true;
              const startPos = this.codePointIterator.start;
              let nextCp;
              while ((nextCp = this.nextCode()) !== -1) {
                if (nextCp === 10) {
                  break;
                }
                if (!(0, code_point_1.isWhitespace)(nextCp)) {
                  this.moveAt(startPos);
                  valid = false;
                  break;
                }
              }
              if (valid) {
                cp = this.nextCode();
                while ((0, code_point_1.isWhitespace)(cp) || cp === 10) {
                  cp = this.nextCode();
                }
                continue;
              }
            }
            return this.reportParseError("invalid-char-in-escape-sequence");
          }
          out.push(cp);
          cp = this.nextCode();
        }
        return this.reportParseError("unterminated-string");
      }
      LITERAL_STRING(cp) {
        if (cp === 39) {
          cp = this.nextCode();
          if (cp === 39) {
            return "MULTI_LINE_LITERAL_STRING";
          }
          this.endToken("LiteralString", "start", "");
          return this.back("DATA");
        }
        const out = [];
        while (cp !== 39 && cp !== -1 && cp !== 10) {
          if (isControlOtherThanTab(cp)) {
            return this.reportParseErrorControlChar();
          }
          out.push(cp);
          cp = this.nextCode();
        }
        if (cp !== 39) {
          return this.reportParseError("unterminated-string");
        }
        this.endToken("LiteralString", "end", String.fromCodePoint(...out));
        return "DATA";
      }
      MULTI_LINE_LITERAL_STRING(cp) {
        const out = [];
        if (cp === 10) {
          cp = this.nextCode();
        }
        while (cp !== -1) {
          if (cp !== 10 && isControlOtherThanTab(cp)) {
            return this.reportParseErrorControlChar();
          }
          if (cp === 39) {
            const startPos = this.codePointIterator.start;
            if (this.eatCode(
              39
              /* CodePoint.SINGLE_QUOTE */
            ) && this.eatCode(
              39
              /* CodePoint.SINGLE_QUOTE */
            )) {
              if (this.eatCode(
                39
                /* CodePoint.SINGLE_QUOTE */
              )) {
                out.push(
                  39
                  /* CodePoint.SINGLE_QUOTE */
                );
                if (this.eatCode(
                  39
                  /* CodePoint.SINGLE_QUOTE */
                )) {
                  out.push(
                    39
                    /* CodePoint.SINGLE_QUOTE */
                  );
                  if (this.eatCode(
                    39
                    /* CodePoint.SINGLE_QUOTE */
                  )) {
                    this.moveAt(startPos);
                    return this.reportParseError("invalid-three-quotes");
                  }
                }
              }
              this.endToken("MultiLineLiteralString", "end", String.fromCodePoint(...out));
              return "DATA";
            }
            this.moveAt(startPos);
          }
          out.push(cp);
          cp = this.nextCode();
        }
        return this.reportParseError("unterminated-string");
      }
      SIGN(cp) {
        if (cp === 110 || cp === 105) {
          return this.back("NAN_OR_INF");
        }
        if ((0, code_point_1.isDigit)(cp)) {
          return this.back("NUMBER");
        }
        return this.reportParseError("unexpected-char");
      }
      NAN_OR_INF(cp) {
        if (cp === 110) {
          const startPos = this.codePointIterator.start;
          if (this.eatCode(
            97
            /* CodePoint.LATIN_SMALL_A */
          ) && this.eatCode(
            110
            /* CodePoint.LATIN_SMALL_N */
          )) {
            this.endToken("Float", "end", NaN);
            return "DATA";
          }
          this.moveAt(startPos);
        } else if (cp === 105) {
          const startPos = this.codePointIterator.start;
          if (this.eatCode(
            110
            /* CodePoint.LATIN_SMALL_N */
          ) && this.eatCode(
            102
            /* CodePoint.LATIN_SMALL_F */
          )) {
            this.endToken("Float", "end", this.text[this.tokenStart] === "-" ? -Infinity : Infinity);
            return "DATA";
          }
          this.moveAt(startPos);
        }
        return this.reportParseError("unexpected-char");
      }
      NUMBER(cp) {
        const start = this.text[this.tokenStart];
        const sign = start === "+" ? 43 : start === "-" ? 45 : 0;
        if (cp === 48) {
          if (sign === 0) {
            const startPos = this.codePointIterator.start;
            const nextCp2 = this.nextCode();
            if ((0, code_point_1.isDigit)(nextCp2)) {
              const nextNextCp = this.nextCode();
              if (nextNextCp === 58) {
                const data = {
                  hasDate: false,
                  year: 0,
                  month: 0,
                  day: 0,
                  hour: Number(String.fromCodePoint(48, nextCp2)),
                  minute: 0,
                  second: 0
                };
                this.data = data;
                return "TIME_MINUTE";
              }
              if ((0, code_point_1.isDigit)(nextNextCp)) {
                const nextNextNextCp = this.nextCode();
                if ((0, code_point_1.isDigit)(nextNextNextCp) && this.eatCode(
                  45
                  /* CodePoint.DASH */
                )) {
                  const data = {
                    hasDate: true,
                    year: Number(String.fromCodePoint(48, nextCp2, nextNextCp, nextNextNextCp)),
                    month: 0,
                    day: 0,
                    hour: 0,
                    minute: 0,
                    second: 0
                  };
                  this.data = data;
                  return "DATE_MONTH";
                }
              }
              this.moveAt(startPos);
              return this.reportParseError("invalid-leading-zero");
            }
            this.moveAt(startPos);
          }
          cp = this.nextCode();
          if (cp === 120 || cp === 111 || cp === 98) {
            if (sign !== 0) {
              return this.reportParseError("unexpected-char");
            }
            return cp === 120 ? "HEX" : cp === 111 ? "OCTAL" : "BINARY";
          }
          if (cp === 101 || cp === 69) {
            const data = {
              // Float values -0.0 and +0.0 are valid and should map according to IEEE 754.
              minus: sign === 45,
              left: [
                48
                /* CodePoint.DIGIT_0 */
              ]
            };
            this.data = data;
            return "EXPONENT_RIGHT";
          }
          if (cp === 46) {
            const data = {
              minus: sign === 45,
              absInt: [
                48
                /* CodePoint.DIGIT_0 */
              ]
            };
            this.data = data;
            return "FRACTIONAL_RIGHT";
          }
          this.endToken("Integer", "start", "0", 10);
          return this.back("DATA");
        }
        const { out, nextCp, hasUnderscore } = this.parseDigits(cp, code_point_1.isDigit);
        if (nextCp === 45 && sign === 0 && !hasUnderscore && out.length === 4) {
          const data = {
            hasDate: true,
            year: Number(String.fromCodePoint(...out)),
            month: 0,
            day: 0,
            hour: 0,
            minute: 0,
            second: 0
          };
          this.data = data;
          return "DATE_MONTH";
        }
        if (nextCp === 58 && sign === 0 && !hasUnderscore && out.length === 2) {
          const data = {
            hasDate: false,
            year: 0,
            month: 0,
            day: 0,
            hour: Number(String.fromCodePoint(...out)),
            minute: 0,
            second: 0
          };
          this.data = data;
          return "TIME_MINUTE";
        }
        if (nextCp === 101 || nextCp === 69) {
          const data = {
            minus: sign === 45,
            left: out
          };
          this.data = data;
          return "EXPONENT_RIGHT";
        }
        if (nextCp === 46) {
          const data = {
            minus: sign === 45,
            absInt: out
          };
          this.data = data;
          return "FRACTIONAL_RIGHT";
        }
        this.endToken("Integer", "start", sign === 45 ? String.fromCodePoint(45, ...out) : String.fromCodePoint(...out), 10);
        return this.back("DATA");
      }
      HEX(cp) {
        const { out } = this.parseDigits(cp, code_point_1.isHexDig);
        this.endToken("Integer", "start", String.fromCodePoint(...out), 16);
        return this.back("DATA");
      }
      OCTAL(cp) {
        const { out } = this.parseDigits(cp, code_point_1.isOctalDig);
        this.endToken("Integer", "start", String.fromCodePoint(...out), 8);
        return this.back("DATA");
      }
      BINARY(cp) {
        const { out } = this.parseDigits(
          cp,
          (c) => c === 48 || c === 49
          /* CodePoint.DIGIT_1 */
        );
        this.endToken("Integer", "start", String.fromCodePoint(...out), 2);
        return this.back("DATA");
      }
      FRACTIONAL_RIGHT(cp) {
        const { minus, absInt } = this.data;
        const { out, nextCp } = this.parseDigits(cp, code_point_1.isDigit);
        const absNum = [...absInt, 46, ...out];
        if (nextCp === 101 || nextCp === 69) {
          const data = {
            minus,
            left: absNum
          };
          this.data = data;
          return "EXPONENT_RIGHT";
        }
        const value = Number(minus ? String.fromCodePoint(45, ...absNum) : String.fromCodePoint(...absNum));
        this.endToken("Float", "start", value);
        return this.back("DATA");
      }
      EXPONENT_RIGHT(cp) {
        const { left, minus: leftMinus } = this.data;
        let minus = false;
        if (cp === 45 || cp === 43) {
          minus = cp === 45;
          cp = this.nextCode();
        }
        const { out } = this.parseDigits(cp, code_point_1.isDigit);
        const right = out;
        if (minus) {
          right.unshift(
            45
            /* CodePoint.DASH */
          );
        }
        const value = Number(leftMinus ? String.fromCodePoint(45, ...left, 101, ...right) : String.fromCodePoint(...left, 101, ...right));
        this.endToken("Float", "start", value);
        return this.back("DATA");
      }
      BOOLEAN(cp) {
        if (cp === 116) {
          const startPos = this.codePointIterator.start;
          if (this.eatCode(
            114
            /* CodePoint.LATIN_SMALL_R */
          ) && this.eatCode(
            117
            /* CodePoint.LATIN_SMALL_U */
          ) && this.eatCode(
            101
            /* CodePoint.LATIN_SMALL_E */
          )) {
            this.endToken("Boolean", "end", true);
            return "DATA";
          }
          this.moveAt(startPos);
        } else if (cp === 102) {
          const startPos = this.codePointIterator.start;
          if (this.eatCode(
            97
            /* CodePoint.LATIN_SMALL_A */
          ) && this.eatCode(
            108
            /* CodePoint.LATIN_SMALL_L */
          ) && this.eatCode(
            115
            /* CodePoint.LATIN_SMALL_S */
          ) && this.eatCode(
            101
            /* CodePoint.LATIN_SMALL_E */
          )) {
            this.endToken("Boolean", "end", false);
            return "DATA";
          }
          this.moveAt(startPos);
        }
        return this.reportParseError("unexpected-char");
      }
      DATE_MONTH(cp) {
        const start = this.codePointIterator.start;
        if (!(0, code_point_1.isDigit)(cp)) {
          return this.reportParseError("unexpected-char");
        }
        cp = this.nextCode();
        if (!(0, code_point_1.isDigit)(cp)) {
          return this.reportParseError("unexpected-char");
        }
        cp = this.nextCode();
        if (cp !== 45) {
          return this.reportParseError("unexpected-char");
        }
        const end = this.codePointIterator.start;
        const data = this.data;
        data.month = Number(this.text.slice(start, end));
        return "DATE_DAY";
      }
      DATE_DAY(cp) {
        const start = this.codePointIterator.start;
        if (!(0, code_point_1.isDigit)(cp)) {
          return this.reportParseError("unexpected-char");
        }
        cp = this.nextCode();
        if (!(0, code_point_1.isDigit)(cp)) {
          return this.reportParseError("unexpected-char");
        }
        const end = this.codePointIterator.end;
        const data = this.data;
        data.day = Number(this.text.slice(start, end));
        if (!isValidDate(data.year, data.month, data.day)) {
          return this.reportParseError("invalid-date");
        }
        cp = this.nextCode();
        if (cp === 84 || cp === 116) {
          return "TIME_HOUR";
        }
        if (cp === 32) {
          const startPos = this.codePointIterator.start;
          if ((0, code_point_1.isDigit)(this.nextCode()) && (0, code_point_1.isDigit)(this.nextCode())) {
            this.moveAt(startPos);
            return "TIME_HOUR";
          }
          this.moveAt(startPos);
        }
        const dateValue = getDateFromDateTimeData(data, "");
        this.endToken("LocalDate", "start", dateValue);
        return this.back("DATA");
      }
      TIME_HOUR(cp) {
        const start = this.codePointIterator.start;
        if (!(0, code_point_1.isDigit)(cp)) {
          return this.reportParseError("unexpected-char");
        }
        cp = this.nextCode();
        if (!(0, code_point_1.isDigit)(cp)) {
          return this.reportParseError("unexpected-char");
        }
        cp = this.nextCode();
        if (cp !== 58) {
          return this.reportParseError("unexpected-char");
        }
        const end = this.codePointIterator.start;
        const data = this.data;
        data.hour = Number(this.text.slice(start, end));
        return "TIME_MINUTE";
      }
      TIME_MINUTE(cp) {
        const start = this.codePointIterator.start;
        if (!(0, code_point_1.isDigit)(cp)) {
          return this.reportParseError("unexpected-char");
        }
        cp = this.nextCode();
        if (!(0, code_point_1.isDigit)(cp)) {
          return this.reportParseError("unexpected-char");
        }
        const end = this.codePointIterator.end;
        const data = this.data;
        data.minute = Number(this.text.slice(start, end));
        cp = this.nextCode();
        if (cp === 58) {
          return "TIME_SECOND";
        }
        if (this.tomlVersion.lt(1, 1)) {
          return this.reportParseError("unexpected-char");
        }
        if (!isValidTime(data.hour, data.minute, data.second)) {
          return this.reportParseError("invalid-time");
        }
        return this.processTimeEnd(cp, data);
      }
      TIME_SECOND(cp) {
        const start = this.codePointIterator.start;
        if (!(0, code_point_1.isDigit)(cp)) {
          return this.reportParseError("unexpected-char");
        }
        cp = this.nextCode();
        if (!(0, code_point_1.isDigit)(cp)) {
          return this.reportParseError("unexpected-char");
        }
        const end = this.codePointIterator.end;
        const data = this.data;
        data.second = Number(this.text.slice(start, end));
        if (!isValidTime(data.hour, data.minute, data.second)) {
          return this.reportParseError("invalid-time");
        }
        cp = this.nextCode();
        if (cp === 46) {
          return "TIME_SEC_FRAC";
        }
        return this.processTimeEnd(cp, data);
      }
      TIME_SEC_FRAC(cp) {
        if (!(0, code_point_1.isDigit)(cp)) {
          return this.reportParseError("unexpected-char");
        }
        const start = this.codePointIterator.start;
        while ((0, code_point_1.isDigit)(cp)) {
          cp = this.nextCode();
        }
        const end = this.codePointIterator.start;
        const data = this.data;
        data.frac = this.text.slice(start, end);
        return this.processTimeEnd(cp, data);
      }
      processTimeEnd(cp, data) {
        if (data.hasDate) {
          if (cp === 45 || cp === 43) {
            data.offsetSign = cp;
            return "TIME_OFFSET";
          }
          if (cp === 90 || cp === 122) {
            const dateValue3 = getDateFromDateTimeData(data, "Z");
            this.endToken("OffsetDateTime", "end", dateValue3);
            return "DATA";
          }
          const dateValue2 = getDateFromDateTimeData(data, "");
          this.endToken("LocalDateTime", "start", dateValue2);
          return this.back("DATA");
        }
        const dateValue = getDateFromDateTimeData(data, "");
        this.endToken("LocalTime", "start", dateValue);
        return this.back("DATA");
      }
      TIME_OFFSET(cp) {
        if (!(0, code_point_1.isDigit)(cp)) {
          return this.reportParseError("unexpected-char");
        }
        const hourStart = this.codePointIterator.start;
        cp = this.nextCode();
        if (!(0, code_point_1.isDigit)(cp)) {
          return this.reportParseError("unexpected-char");
        }
        cp = this.nextCode();
        if (cp !== 58) {
          return this.reportParseError("unexpected-char");
        }
        const hourEnd = this.codePointIterator.start;
        cp = this.nextCode();
        const minuteStart = this.codePointIterator.start;
        if (!(0, code_point_1.isDigit)(cp)) {
          return this.reportParseError("unexpected-char");
        }
        cp = this.nextCode();
        if (!(0, code_point_1.isDigit)(cp)) {
          return this.reportParseError("unexpected-char");
        }
        const minuteEnd = this.codePointIterator.end;
        const hour = Number(this.text.slice(hourStart, hourEnd));
        const minute = Number(this.text.slice(minuteStart, minuteEnd));
        if (!isValidTime(hour, minute, 0)) {
          return this.reportParseError("invalid-time");
        }
        const data = this.data;
        const dateValue = getDateFromDateTimeData(data, `${String.fromCodePoint(data.offsetSign)}${padStart(hour, 2)}:${padStart(minute, 2)}`);
        this.endToken("OffsetDateTime", "end", dateValue);
        return "DATA";
      }
      parseDigits(cp, checkDigit) {
        if (cp === 95) {
          return this.reportParseError("invalid-underscore");
        }
        if (!checkDigit(cp)) {
          return this.reportParseError("unexpected-char");
        }
        const out = [];
        let before = 0;
        let hasUnderscore = false;
        while (checkDigit(cp) || cp === 95) {
          if (cp === 95) {
            hasUnderscore = true;
            if (before === 95) {
              return this.reportParseError("invalid-underscore");
            }
          } else {
            out.push(cp);
          }
          before = cp;
          cp = this.nextCode();
        }
        if (before === 95) {
          return this.reportParseError("invalid-underscore");
        }
        return {
          out,
          nextCp: cp,
          hasUnderscore
        };
      }
      parseUnicode(count) {
        const startLoc = this.codePointIterator.start;
        const start = this.codePointIterator.end;
        let charCount = 0;
        let cp;
        while ((cp = this.nextCode()) !== -1) {
          if (!(0, code_point_1.isHexDig)(cp)) {
            this.moveAt(startLoc);
            return this.reportParseError("invalid-char-in-escape-sequence");
          }
          charCount++;
          if (charCount >= count) {
            break;
          }
        }
        const end = this.codePointIterator.end;
        const code = this.text.slice(start, end);
        const codePoint = parseInt(code, 16);
        if (!(0, code_point_1.isUnicodeScalarValue)(codePoint)) {
          return this.reportParseError("invalid-code-point", { cp: code });
        }
        return codePoint;
      }
      reportParseErrorControlChar() {
        return this.reportParseError("invalid-control-character");
      }
    };
    exports2.Tokenizer = Tokenizer;
    function isUnquotedKeyChar(cp, tomlVersion) {
      if ((0, code_point_1.isLetter)(cp) || (0, code_point_1.isDigit)(cp) || cp === 95 || cp === 45) {
        return true;
      }
      if (tomlVersion.lt(1, 1)) {
        return false;
      }
      return false;
    }
    function isControlOtherThanTab(cp) {
      return (0, code_point_1.isControl)(cp) && cp !== 9 || cp === 127;
    }
    function isNonEOL(cp) {
      return cp === 9 || 32 <= cp && cp <= 126 || isNonAscii(cp);
    }
    function isNonAscii(cp) {
      return 128 <= cp && cp <= 55295 || 57344 <= cp && cp <= 1114111;
    }
    function isValidDate(y, m, d) {
      if (y >= 0 && m <= 12 && m >= 1 && d >= 1) {
        const maxDayOfMonth = m === 2 ? y & 3 || !(y % 25) && y & 15 ? 28 : 29 : 30 + (m + (m >> 3) & 1);
        return d <= maxDayOfMonth;
      }
      return false;
    }
    function isValidTime(h, m, s) {
      if (h >= 24 || h < 0 || m > 59 || m < 0 || s > 60 || s < 0) {
        return false;
      }
      return true;
    }
    function getDateFromDateTimeData(data, timeZone) {
      const year = padStart(data.year, 4);
      const month = data.month ? padStart(data.month, 2) : "01";
      const day = data.day ? padStart(data.day, 2) : "01";
      const hour = padStart(data.hour, 2);
      const minute = padStart(data.minute, 2);
      const second = padStart(data.second, 2);
      const textDate = `${year}-${month}-${day}`;
      const frac = data.frac ? `.${data.frac}` : "";
      const dateValue = /* @__PURE__ */ new Date(`${textDate}T${hour}:${minute}:${second}${frac}${timeZone}`);
      if (!isNaN(dateValue.getTime()) || data.second !== 60) {
        return dateValue;
      }
      return /* @__PURE__ */ new Date(`${textDate}T${hour}:${minute}:59${frac}${timeZone}`);
    }
    function padStart(num, maxLength) {
      return String(num).padStart(maxLength, "0");
    }
  }
});

// node_modules/toml-eslint-parser/lib/tokenizer/index.js
var require_tokenizer2 = __commonJS({
  "node_modules/toml-eslint-parser/lib/tokenizer/index.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    __exportStar(require_tokenizer(), exports2);
  }
});

// node_modules/toml-eslint-parser/lib/toml-parser/keys-resolver.js
var require_keys_resolver = __commonJS({
  "node_modules/toml-eslint-parser/lib/toml-parser/keys-resolver.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.KeysResolver = void 0;
    var internal_utils_1 = require_internal_utils();
    var KeysResolver = class {
      constructor(ctx) {
        this.rootKeys = /* @__PURE__ */ new Map();
        this.tables = [];
        this.ctx = ctx;
      }
      applyResolveKeyForTable(node) {
        let keys = this.rootKeys;
        const peekKeyIndex = node.key.keys.length - 1;
        for (let index = 0; index < peekKeyIndex; index++) {
          const keyNode = node.key.keys[index];
          const keyName = (0, internal_utils_1.toKeyName)(keyNode);
          node.resolvedKey.push(keyName);
          let keyStore = keys.get(keyName);
          if (!keyStore) {
            keyStore = { node: keyNode, keys: /* @__PURE__ */ new Map() };
            keys.set(keyName, keyStore);
          } else if (keyStore.table === "array") {
            const peekIndex = keyStore.peekIndex;
            node.resolvedKey.push(peekIndex);
            keyStore = keyStore.keys.get(peekIndex);
          }
          keys = keyStore.keys;
        }
        const lastKeyNode = node.key.keys[peekKeyIndex];
        const lastKeyName = (0, internal_utils_1.toKeyName)(lastKeyNode);
        node.resolvedKey.push(lastKeyName);
        const lastKeyStore = keys.get(lastKeyName);
        if (!lastKeyStore) {
          if (node.kind === "array") {
            node.resolvedKey.push(0);
            const newKeyStore = {
              node: lastKeyNode,
              keys: /* @__PURE__ */ new Map()
            };
            keys.set(lastKeyName, {
              table: node.kind,
              node: lastKeyNode,
              keys: /* @__PURE__ */ new Map([[0, newKeyStore]]),
              peekIndex: 0
            });
            this.tables.push({ node, keys: newKeyStore.keys });
          } else {
            const newKeyStore = {
              table: node.kind,
              node: lastKeyNode,
              keys: /* @__PURE__ */ new Map()
            };
            keys.set(lastKeyName, newKeyStore);
            this.tables.push({ node, keys: newKeyStore.keys });
          }
        } else if (!lastKeyStore.table) {
          if (node.kind === "array") {
            this.ctx.reportParseError("dupe-keys", lastKeyNode);
          } else {
            const transformKey = {
              table: node.kind,
              node: lastKeyNode,
              keys: lastKeyStore.keys
            };
            keys.set(lastKeyName, transformKey);
            this.tables.push({ node, keys: transformKey.keys });
          }
        } else if (lastKeyStore.table === "array") {
          if (node.kind === "array") {
            const newKeyStore = {
              node: lastKeyNode,
              keys: /* @__PURE__ */ new Map()
            };
            const newIndex = lastKeyStore.peekIndex + 1;
            node.resolvedKey.push(newIndex);
            lastKeyStore.keys.set(newIndex, newKeyStore);
            lastKeyStore.peekIndex = newIndex;
            this.tables.push({ node, keys: newKeyStore.keys });
          } else {
            this.ctx.reportParseError("dupe-keys", lastKeyNode);
          }
        } else {
          this.ctx.reportParseError("dupe-keys", lastKeyNode);
        }
      }
      verifyDuplicateKeys(node) {
        for (const body of node.body) {
          if (body.type === "TOMLKeyValue") {
            verifyDuplicateKeysForKeyValue(this.ctx, this.rootKeys, body);
          }
        }
        for (const { node: tableNode, keys } of this.tables) {
          for (const body of tableNode.body) {
            verifyDuplicateKeysForKeyValue(this.ctx, keys, body);
          }
        }
      }
    };
    exports2.KeysResolver = KeysResolver;
    function verifyDuplicateKeysForKeyValue(ctx, defineKeys, node) {
      let keys = defineKeys;
      const lastKey = (0, internal_utils_1.last)(node.key.keys);
      for (const keyNode of node.key.keys) {
        const key = (0, internal_utils_1.toKeyName)(keyNode);
        let defineKey = keys.get(key);
        if (defineKey) {
          if (defineKey.value === 0) {
            ctx.reportParseError("dupe-keys", getAfterNode(keyNode, defineKey.node));
          } else if (lastKey === keyNode) {
            ctx.reportParseError("dupe-keys", getAfterNode(keyNode, defineKey.node));
          } else if (defineKey.table) {
            ctx.reportParseError("dupe-keys", getAfterNode(keyNode, defineKey.node));
          }
          defineKey.value = 1;
        } else {
          if (lastKey === keyNode) {
            const keyStore = {
              value: 0,
              node: keyNode,
              keys: /* @__PURE__ */ new Map()
            };
            defineKey = keyStore;
          } else {
            const keyStore = {
              value: 1,
              node: keyNode,
              keys: /* @__PURE__ */ new Map()
            };
            defineKey = keyStore;
          }
          keys.set(key, defineKey);
        }
        keys = defineKey.keys;
      }
      if (node.value.type === "TOMLInlineTable") {
        verifyDuplicateKeysForInlineTable(ctx, keys, node.value);
      } else if (node.value.type === "TOMLArray") {
        verifyDuplicateKeysForArray(ctx, keys, node.value);
      }
    }
    function verifyDuplicateKeysForInlineTable(ctx, defineKeys, node) {
      for (const body of node.body) {
        verifyDuplicateKeysForKeyValue(ctx, defineKeys, body);
      }
    }
    function verifyDuplicateKeysForArray(ctx, defineKeys, node) {
      const keys = defineKeys;
      for (let index = 0; index < node.elements.length; index++) {
        const element = node.elements[index];
        let defineKey = keys.get(index);
        if (defineKey) {
          ctx.reportParseError("dupe-keys", getAfterNode(element, defineKey.node));
        } else {
          defineKey = {
            value: 0,
            node: element,
            keys: /* @__PURE__ */ new Map()
          };
          defineKeys.set(index, defineKey);
          if (element.type === "TOMLInlineTable") {
            verifyDuplicateKeysForInlineTable(ctx, defineKey.keys, element);
          } else if (element.type === "TOMLArray") {
            verifyDuplicateKeysForArray(ctx, defineKey.keys, element);
          }
        }
      }
    }
    function getAfterNode(a, b) {
      return a.range[0] <= b.range[0] ? b : a;
    }
  }
});

// node_modules/toml-eslint-parser/lib/toml-parser/context.js
var require_context = __commonJS({
  "node_modules/toml-eslint-parser/lib/toml-parser/context.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Context = void 0;
    var errors_1 = require_errors();
    var tokenizer_1 = require_tokenizer2();
    var keys_resolver_1 = require_keys_resolver();
    var Context = class {
      constructor(data) {
        this.tokens = [];
        this.comments = [];
        this.back = null;
        this.stateStack = [];
        this.needNewLine = false;
        this.needSameLine = false;
        this.currToken = null;
        this.prevToken = null;
        this.valueContainerStack = [];
        this.tokenizer = new tokenizer_1.Tokenizer(data.text, data.parserOptions);
        this.topLevelTable = data.topLevelTable;
        this.table = data.topLevelTable;
        this.keysResolver = new keys_resolver_1.KeysResolver(this);
      }
      /**
       * Get the next token.
       */
      nextToken(option) {
        this.prevToken = this.currToken;
        if (this.back) {
          this.currToken = this.back;
          this.back = null;
        } else {
          this.currToken = this._nextTokenFromTokenizer(option);
        }
        if ((this.needNewLine || this.needSameLine || (option === null || option === void 0 ? void 0 : option.needSameLine)) && this.prevToken && this.currToken) {
          if (this.prevToken.loc.end.line === this.currToken.loc.start.line) {
            if (this.needNewLine) {
              return this.reportParseError("missing-newline", this.currToken);
            }
          } else {
            const needSameLine = this.needSameLine || (option === null || option === void 0 ? void 0 : option.needSameLine);
            if (needSameLine) {
              return this.reportParseError(needSameLine, this.currToken);
            }
          }
        }
        this.needNewLine = false;
        this.needSameLine = false;
        return this.currToken;
      }
      _nextTokenFromTokenizer(option) {
        const valuesEnabled = this.tokenizer.valuesEnabled;
        if (option === null || option === void 0 ? void 0 : option.valuesEnabled) {
          this.tokenizer.valuesEnabled = option.valuesEnabled;
        }
        let token = this.tokenizer.nextToken();
        while (token && token.type === "Block") {
          this.comments.push(token);
          token = this.tokenizer.nextToken();
        }
        if (token) {
          this.tokens.push(token);
        }
        this.tokenizer.valuesEnabled = valuesEnabled;
        return token;
      }
      backToken() {
        if (this.back) {
          throw new Error("Illegal state");
        }
        this.back = this.currToken;
        this.currToken = this.prevToken;
      }
      addValueContainer(valueContainer) {
        this.valueContainerStack.push(valueContainer);
        this.tokenizer.valuesEnabled = true;
      }
      consumeValueContainer() {
        const valueContainer = this.valueContainerStack.pop();
        this.tokenizer.valuesEnabled = this.valueContainerStack.length > 0;
        return valueContainer;
      }
      applyResolveKeyForTable(node) {
        this.keysResolver.applyResolveKeyForTable(node);
      }
      verifyDuplicateKeys() {
        this.keysResolver.verifyDuplicateKeys(this.topLevelTable);
      }
      /**
       * Report an invalid token error.
       */
      reportParseError(code, token) {
        let offset, line, column;
        if (token) {
          offset = token.range[0];
          line = token.loc.start.line;
          column = token.loc.start.column;
        } else {
          offset = this.tokenizer.start;
          const startPos = this.tokenizer.getLocFromIndex(offset);
          line = startPos.line;
          column = startPos.column;
        }
        throw new errors_1.ParseError(code, offset, line, column);
      }
    };
    exports2.Context = Context;
  }
});

// node_modules/toml-eslint-parser/lib/toml-parser/index.js
var require_toml_parser2 = __commonJS({
  "node_modules/toml-eslint-parser/lib/toml-parser/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TOMLParser = void 0;
    var internal_utils_1 = require_internal_utils();
    var parser_options_1 = require_parser_options();
    var context_1 = require_context();
    var STATE_FOR_ERROR = {
      VALUE: "missing-value"
    };
    var STRING_VALUE_STYLE_MAP = {
      BasicString: "basic",
      MultiLineBasicString: "basic",
      LiteralString: "literal",
      MultiLineLiteralString: "literal"
    };
    var STRING_KEY_STYLE_MAP = {
      BasicString: "basic",
      LiteralString: "literal"
    };
    var DATETIME_VALUE_KIND_MAP = {
      OffsetDateTime: "offset-date-time",
      LocalDateTime: "local-date-time",
      LocalDate: "local-date",
      LocalTime: "local-time"
    };
    var TOMLParser = class {
      /**
       * Initialize this parser.
       */
      constructor(text, parserOptions) {
        this.text = text;
        this.parserOptions = parserOptions || {};
        this.tomlVersion = (0, parser_options_1.getTOMLVer)(this.parserOptions.tomlVersion);
      }
      /**
       * Parse TOML
       */
      parse() {
        const ast = {
          type: "Program",
          body: [],
          sourceType: "module",
          tokens: [],
          comments: [],
          parent: null,
          range: [0, 0],
          loc: {
            start: {
              line: 1,
              column: 0
            },
            end: {
              line: 1,
              column: 0
            }
          }
        };
        const node = {
          type: "TOMLTopLevelTable",
          body: [],
          parent: ast,
          range: cloneRange(ast.range),
          loc: cloneLoc(ast.loc)
        };
        ast.body = [node];
        const ctx = new context_1.Context({
          text: this.text,
          parserOptions: this.parserOptions,
          topLevelTable: node
        });
        let token = ctx.nextToken();
        if (token) {
          node.range[0] = token.range[0];
          node.loc.start = clonePos(token.loc.start);
          while (token) {
            const state2 = ctx.stateStack.pop() || "TABLE";
            ctx.stateStack.push(...this[state2](token, ctx));
            token = ctx.nextToken();
          }
          const state = ctx.stateStack.pop() || "TABLE";
          if (state in STATE_FOR_ERROR) {
            return ctx.reportParseError(STATE_FOR_ERROR[state], null);
          }
          if (ctx.table.type === "TOMLTable") {
            applyEndLoc(ctx.table, (0, internal_utils_1.last)(ctx.table.body));
          }
          applyEndLoc(node, (0, internal_utils_1.last)(node.body));
        }
        ctx.verifyDuplicateKeys();
        ast.tokens = ctx.tokens;
        ast.comments = ctx.comments;
        const endOffset = ctx.tokenizer.end;
        const endPos = ctx.tokenizer.getLocFromIndex(endOffset);
        ast.range[1] = endOffset;
        ast.loc.end = {
          line: endPos.line,
          column: endPos.column
        };
        return ast;
      }
      TABLE(token, ctx) {
        if (isBare(token) || isString(token)) {
          return this.processKeyValue(token, ctx.table, ctx);
        }
        if (isLeftBracket(token)) {
          return this.processTable(token, ctx.topLevelTable, ctx);
        }
        return ctx.reportParseError("unexpected-token", token);
      }
      VALUE(token, ctx) {
        if (isString(token) || isMultiLineString(token)) {
          return this.processStringValue(token, ctx);
        }
        if (isNumber(token)) {
          return this.processNumberValue(token, ctx);
        }
        if (isBoolean(token)) {
          return this.processBooleanValue(token, ctx);
        }
        if (isDateTime(token)) {
          return this.processDateTimeValue(token, ctx);
        }
        if (isLeftBracket(token)) {
          return this.processArray(token, ctx);
        }
        if (isLeftBrace(token)) {
          return this.processInlineTable(token, ctx);
        }
        return ctx.reportParseError("unexpected-token", token);
      }
      processTable(token, topLevelTableNode, ctx) {
        const tableNode = {
          type: "TOMLTable",
          kind: "standard",
          key: null,
          resolvedKey: [],
          body: [],
          parent: topLevelTableNode,
          range: cloneRange(token.range),
          loc: cloneLoc(token.loc)
        };
        if (ctx.table.type === "TOMLTable") {
          applyEndLoc(ctx.table, (0, internal_utils_1.last)(ctx.table.body));
        }
        topLevelTableNode.body.push(tableNode);
        ctx.table = tableNode;
        let targetToken = ctx.nextToken({
          needSameLine: "invalid-key-value-newline"
        });
        if (isLeftBracket(targetToken)) {
          if (token.range[1] < targetToken.range[0]) {
            return ctx.reportParseError("invalid-space", targetToken);
          }
          tableNode.kind = "array";
          targetToken = ctx.nextToken({
            needSameLine: "invalid-key-value-newline"
          });
        }
        if (isRightBracket(targetToken)) {
          return ctx.reportParseError("missing-key", targetToken);
        }
        if (!targetToken) {
          return ctx.reportParseError("unterminated-table-key", null);
        }
        const keyNodeData = this.processKeyNode(targetToken, tableNode, ctx);
        targetToken = keyNodeData.nextToken;
        if (!isRightBracket(targetToken)) {
          return ctx.reportParseError("unterminated-table-key", targetToken);
        }
        if (tableNode.kind === "array") {
          const rightBracket = targetToken;
          targetToken = ctx.nextToken({
            needSameLine: "invalid-key-value-newline"
          });
          if (!isRightBracket(targetToken)) {
            return ctx.reportParseError("unterminated-table-key", targetToken);
          }
          if (rightBracket.range[1] < targetToken.range[0]) {
            return ctx.reportParseError("invalid-space", targetToken);
          }
        }
        applyEndLoc(tableNode, targetToken);
        ctx.applyResolveKeyForTable(tableNode);
        ctx.needNewLine = true;
        return [];
      }
      processKeyValue(token, tableNode, ctx) {
        const keyValueNode = {
          type: "TOMLKeyValue",
          key: null,
          value: null,
          parent: tableNode,
          range: cloneRange(token.range),
          loc: cloneLoc(token.loc)
        };
        tableNode.body.push(keyValueNode);
        const { nextToken: targetToken } = this.processKeyNode(token, keyValueNode, ctx);
        if (!isEq(targetToken)) {
          return ctx.reportParseError("missing-equals-sign", targetToken);
        }
        ctx.addValueContainer({
          parent: keyValueNode,
          set: (valNode) => {
            keyValueNode.value = valNode;
            applyEndLoc(keyValueNode, valNode);
            ctx.needNewLine = true;
            return [];
          }
        });
        ctx.needSameLine = "invalid-key-value-newline";
        return ["VALUE"];
      }
      processKeyNode(token, parent, ctx) {
        if (isDot(token)) {
          ctx.reportParseError("invalid-leading-dot-in-key", token);
        }
        const keyNode = {
          type: "TOMLKey",
          keys: [],
          parent,
          range: cloneRange(token.range),
          loc: cloneLoc(token.loc)
        };
        parent.key = keyNode;
        let targetToken = token;
        let dotToken = null;
        do {
          if (isBare(targetToken)) {
            this.processBareKey(targetToken, keyNode);
          } else if (isString(targetToken)) {
            this.processStringKey(targetToken, keyNode);
          } else {
            break;
          }
          dotToken = null;
          targetToken = ctx.nextToken({
            needSameLine: "invalid-key-value-newline"
          });
          if (!isDot(targetToken))
            break;
          dotToken = targetToken;
          targetToken = ctx.nextToken({
            needSameLine: "invalid-key-value-newline"
          });
        } while (targetToken);
        if (dotToken) {
          ctx.reportParseError(isDot(targetToken) ? "invalid-consecutive-dots-in-key" : "invalid-trailing-dot-in-key", dotToken);
        }
        applyEndLoc(keyNode, (0, internal_utils_1.last)(keyNode.keys));
        return { keyNode, nextToken: targetToken };
      }
      processBareKey(token, keyNode) {
        const node = {
          type: "TOMLBare",
          name: token.value,
          parent: keyNode,
          range: cloneRange(token.range),
          loc: cloneLoc(token.loc)
        };
        keyNode.keys.push(node);
      }
      processStringKey(token, keyNode) {
        const node = {
          type: "TOMLQuoted",
          kind: "string",
          value: token.string,
          style: STRING_KEY_STYLE_MAP[token.type],
          multiline: false,
          parent: keyNode,
          range: cloneRange(token.range),
          loc: cloneLoc(token.loc)
        };
        keyNode.keys.push(node);
      }
      processStringValue(token, ctx) {
        const valueContainer = ctx.consumeValueContainer();
        const node = {
          type: "TOMLValue",
          kind: "string",
          value: token.string,
          style: STRING_VALUE_STYLE_MAP[token.type],
          multiline: isMultiLineString(token),
          parent: valueContainer.parent,
          range: cloneRange(token.range),
          loc: cloneLoc(token.loc)
        };
        return valueContainer.set(node);
      }
      processNumberValue(token, ctx) {
        const valueContainer = ctx.consumeValueContainer();
        const text = this.text;
        const [startRange, endRange] = token.range;
        let numberString = null;
        const getNumberText = () => {
          return numberString !== null && numberString !== void 0 ? numberString : numberString = text.slice(startRange, endRange).replace(/_/g, "");
        };
        let node;
        if (token.type === "Integer") {
          node = {
            type: "TOMLValue",
            kind: "integer",
            value: token.number,
            bigint: token.bigint,
            get number() {
              return getNumberText();
            },
            parent: valueContainer.parent,
            range: cloneRange(token.range),
            loc: cloneLoc(token.loc)
          };
        } else {
          node = {
            type: "TOMLValue",
            kind: "float",
            value: token.number,
            get number() {
              return getNumberText();
            },
            parent: valueContainer.parent,
            range: cloneRange(token.range),
            loc: cloneLoc(token.loc)
          };
        }
        return valueContainer.set(node);
      }
      processBooleanValue(token, ctx) {
        const valueContainer = ctx.consumeValueContainer();
        const node = {
          type: "TOMLValue",
          kind: "boolean",
          value: token.boolean,
          parent: valueContainer.parent,
          range: cloneRange(token.range),
          loc: cloneLoc(token.loc)
        };
        return valueContainer.set(node);
      }
      processDateTimeValue(token, ctx) {
        const valueContainer = ctx.consumeValueContainer();
        const node = {
          type: "TOMLValue",
          kind: DATETIME_VALUE_KIND_MAP[token.type],
          value: token.date,
          datetime: token.value,
          parent: valueContainer.parent,
          range: cloneRange(token.range),
          loc: cloneLoc(token.loc)
        };
        return valueContainer.set(node);
      }
      processArray(token, ctx) {
        const valueContainer = ctx.consumeValueContainer();
        const node = {
          type: "TOMLArray",
          elements: [],
          parent: valueContainer.parent,
          range: cloneRange(token.range),
          loc: cloneLoc(token.loc)
        };
        const nextToken = ctx.nextToken({ valuesEnabled: true });
        if (isRightBracket(nextToken)) {
          applyEndLoc(node, nextToken);
          return valueContainer.set(node);
        }
        ctx.backToken();
        return this.processArrayValue(node, valueContainer, ctx);
      }
      processArrayValue(node, valueContainer, ctx) {
        ctx.addValueContainer({
          parent: node,
          set: (valNode) => {
            node.elements.push(valNode);
            let nextToken = ctx.nextToken({ valuesEnabled: true });
            const hasComma = isComma(nextToken);
            if (hasComma) {
              nextToken = ctx.nextToken({ valuesEnabled: true });
            }
            if (isRightBracket(nextToken)) {
              applyEndLoc(node, nextToken);
              return valueContainer.set(node);
            }
            if (hasComma) {
              ctx.backToken();
              return this.processArrayValue(node, valueContainer, ctx);
            }
            return ctx.reportParseError(nextToken ? "missing-comma" : "unterminated-array", nextToken);
          }
        });
        return ["VALUE"];
      }
      processInlineTable(token, ctx) {
        const valueContainer = ctx.consumeValueContainer();
        const node = {
          type: "TOMLInlineTable",
          body: [],
          parent: valueContainer.parent,
          range: cloneRange(token.range),
          loc: cloneLoc(token.loc)
        };
        const needSameLine = this.tomlVersion.gte(1, 1) ? (
          // Line breaks in inline tables are allowed.
          // Added in TOML 1.1
          void 0
        ) : "invalid-inline-table-newline";
        const nextToken = ctx.nextToken({
          needSameLine
        });
        if (nextToken) {
          if (isBare(nextToken) || isString(nextToken)) {
            return this.processInlineTableKeyValue(nextToken, node, valueContainer, ctx);
          }
          if (isRightBrace(nextToken)) {
            applyEndLoc(node, nextToken);
            return valueContainer.set(node);
          }
        }
        return ctx.reportParseError("unexpected-token", nextToken);
      }
      processInlineTableKeyValue(token, inlineTableNode, valueContainer, ctx) {
        const keyValueNode = {
          type: "TOMLKeyValue",
          key: null,
          value: null,
          parent: inlineTableNode,
          range: cloneRange(token.range),
          loc: cloneLoc(token.loc)
        };
        inlineTableNode.body.push(keyValueNode);
        const { nextToken: targetToken } = this.processKeyNode(token, keyValueNode, ctx);
        if (!isEq(targetToken)) {
          return ctx.reportParseError("missing-equals-sign", targetToken);
        }
        const needSameLine = this.tomlVersion.gte(1, 1) ? (
          // Line breaks in inline tables are allowed.
          // Added in TOML 1.1
          void 0
        ) : "invalid-inline-table-newline";
        ctx.addValueContainer({
          parent: keyValueNode,
          set: (valNode) => {
            keyValueNode.value = valNode;
            applyEndLoc(keyValueNode, valNode);
            let nextToken = ctx.nextToken({ needSameLine });
            if (isComma(nextToken)) {
              nextToken = ctx.nextToken({ needSameLine });
              if (nextToken && (isBare(nextToken) || isString(nextToken))) {
                return this.processInlineTableKeyValue(nextToken, inlineTableNode, valueContainer, ctx);
              }
              if (isRightBrace(nextToken)) {
                if (this.tomlVersion.lt(1, 1)) {
                  return ctx.reportParseError("invalid-trailing-comma-in-inline-table", nextToken);
                }
              } else {
                return ctx.reportParseError(nextToken ? "unexpected-token" : "unterminated-inline-table", nextToken);
              }
            }
            if (isRightBrace(nextToken)) {
              applyEndLoc(inlineTableNode, nextToken);
              return valueContainer.set(inlineTableNode);
            }
            return ctx.reportParseError(nextToken ? "missing-comma" : "unterminated-inline-table", nextToken);
          }
        });
        ctx.needSameLine = "invalid-key-value-newline";
        return ["VALUE"];
      }
    };
    exports2.TOMLParser = TOMLParser;
    function isDot(token) {
      return isPunctuator(token) && token.value === ".";
    }
    function isEq(token) {
      return isPunctuator(token) && token.value === "=";
    }
    function isLeftBracket(token) {
      return isPunctuator(token) && token.value === "[";
    }
    function isRightBracket(token) {
      return isPunctuator(token) && token.value === "]";
    }
    function isLeftBrace(token) {
      return isPunctuator(token) && token.value === "{";
    }
    function isRightBrace(token) {
      return isPunctuator(token) && token.value === "}";
    }
    function isComma(token) {
      return isPunctuator(token) && token.value === ",";
    }
    function isPunctuator(token) {
      return Boolean(token && token.type === "Punctuator");
    }
    function isBare(token) {
      return token.type === "Bare";
    }
    function isString(token) {
      return token.type === "BasicString" || token.type === "LiteralString";
    }
    function isMultiLineString(token) {
      return token.type === "MultiLineBasicString" || token.type === "MultiLineLiteralString";
    }
    function isNumber(token) {
      return token.type === "Integer" || token.type === "Float";
    }
    function isBoolean(token) {
      return token.type === "Boolean";
    }
    function isDateTime(token) {
      return token.type === "OffsetDateTime" || token.type === "LocalDateTime" || token.type === "LocalDate" || token.type === "LocalTime";
    }
    function applyEndLoc(node, child) {
      if (child) {
        node.range[1] = child.range[1];
        node.loc.end = clonePos(child.loc.end);
      }
    }
    function cloneRange(range) {
      return [range[0], range[1]];
    }
    function cloneLoc(loc) {
      return {
        start: clonePos(loc.start),
        end: clonePos(loc.end)
      };
    }
    function clonePos(pos) {
      return {
        line: pos.line,
        column: pos.column
      };
    }
  }
});

// node_modules/eslint-visitor-keys/dist/eslint-visitor-keys.cjs
var require_eslint_visitor_keys = __commonJS({
  "node_modules/eslint-visitor-keys/dist/eslint-visitor-keys.cjs"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var KEYS = {
      ArrayExpression: [
        "elements"
      ],
      ArrayPattern: [
        "elements"
      ],
      ArrowFunctionExpression: [
        "params",
        "body"
      ],
      AssignmentExpression: [
        "left",
        "right"
      ],
      AssignmentPattern: [
        "left",
        "right"
      ],
      AwaitExpression: [
        "argument"
      ],
      BinaryExpression: [
        "left",
        "right"
      ],
      BlockStatement: [
        "body"
      ],
      BreakStatement: [
        "label"
      ],
      CallExpression: [
        "callee",
        "arguments"
      ],
      CatchClause: [
        "param",
        "body"
      ],
      ChainExpression: [
        "expression"
      ],
      ClassBody: [
        "body"
      ],
      ClassDeclaration: [
        "id",
        "superClass",
        "body"
      ],
      ClassExpression: [
        "id",
        "superClass",
        "body"
      ],
      ConditionalExpression: [
        "test",
        "consequent",
        "alternate"
      ],
      ContinueStatement: [
        "label"
      ],
      DebuggerStatement: [],
      DoWhileStatement: [
        "body",
        "test"
      ],
      EmptyStatement: [],
      ExperimentalRestProperty: [
        "argument"
      ],
      ExperimentalSpreadProperty: [
        "argument"
      ],
      ExportAllDeclaration: [
        "exported",
        "source"
      ],
      ExportDefaultDeclaration: [
        "declaration"
      ],
      ExportNamedDeclaration: [
        "declaration",
        "specifiers",
        "source"
      ],
      ExportSpecifier: [
        "exported",
        "local"
      ],
      ExpressionStatement: [
        "expression"
      ],
      ForInStatement: [
        "left",
        "right",
        "body"
      ],
      ForOfStatement: [
        "left",
        "right",
        "body"
      ],
      ForStatement: [
        "init",
        "test",
        "update",
        "body"
      ],
      FunctionDeclaration: [
        "id",
        "params",
        "body"
      ],
      FunctionExpression: [
        "id",
        "params",
        "body"
      ],
      Identifier: [],
      IfStatement: [
        "test",
        "consequent",
        "alternate"
      ],
      ImportDeclaration: [
        "specifiers",
        "source"
      ],
      ImportDefaultSpecifier: [
        "local"
      ],
      ImportExpression: [
        "source"
      ],
      ImportNamespaceSpecifier: [
        "local"
      ],
      ImportSpecifier: [
        "imported",
        "local"
      ],
      JSXAttribute: [
        "name",
        "value"
      ],
      JSXClosingElement: [
        "name"
      ],
      JSXClosingFragment: [],
      JSXElement: [
        "openingElement",
        "children",
        "closingElement"
      ],
      JSXEmptyExpression: [],
      JSXExpressionContainer: [
        "expression"
      ],
      JSXFragment: [
        "openingFragment",
        "children",
        "closingFragment"
      ],
      JSXIdentifier: [],
      JSXMemberExpression: [
        "object",
        "property"
      ],
      JSXNamespacedName: [
        "namespace",
        "name"
      ],
      JSXOpeningElement: [
        "name",
        "attributes"
      ],
      JSXOpeningFragment: [],
      JSXSpreadAttribute: [
        "argument"
      ],
      JSXSpreadChild: [
        "expression"
      ],
      JSXText: [],
      LabeledStatement: [
        "label",
        "body"
      ],
      Literal: [],
      LogicalExpression: [
        "left",
        "right"
      ],
      MemberExpression: [
        "object",
        "property"
      ],
      MetaProperty: [
        "meta",
        "property"
      ],
      MethodDefinition: [
        "key",
        "value"
      ],
      NewExpression: [
        "callee",
        "arguments"
      ],
      ObjectExpression: [
        "properties"
      ],
      ObjectPattern: [
        "properties"
      ],
      PrivateIdentifier: [],
      Program: [
        "body"
      ],
      Property: [
        "key",
        "value"
      ],
      PropertyDefinition: [
        "key",
        "value"
      ],
      RestElement: [
        "argument"
      ],
      ReturnStatement: [
        "argument"
      ],
      SequenceExpression: [
        "expressions"
      ],
      SpreadElement: [
        "argument"
      ],
      StaticBlock: [
        "body"
      ],
      Super: [],
      SwitchCase: [
        "test",
        "consequent"
      ],
      SwitchStatement: [
        "discriminant",
        "cases"
      ],
      TaggedTemplateExpression: [
        "tag",
        "quasi"
      ],
      TemplateElement: [],
      TemplateLiteral: [
        "quasis",
        "expressions"
      ],
      ThisExpression: [],
      ThrowStatement: [
        "argument"
      ],
      TryStatement: [
        "block",
        "handler",
        "finalizer"
      ],
      UnaryExpression: [
        "argument"
      ],
      UpdateExpression: [
        "argument"
      ],
      VariableDeclaration: [
        "declarations"
      ],
      VariableDeclarator: [
        "id",
        "init"
      ],
      WhileStatement: [
        "test",
        "body"
      ],
      WithStatement: [
        "object",
        "body"
      ],
      YieldExpression: [
        "argument"
      ]
    };
    var NODE_TYPES = Object.keys(KEYS);
    for (const type of NODE_TYPES) {
      Object.freeze(KEYS[type]);
    }
    Object.freeze(KEYS);
    var KEY_BLACKLIST = /* @__PURE__ */ new Set([
      "parent",
      "leadingComments",
      "trailingComments"
    ]);
    function filterKey(key) {
      return !KEY_BLACKLIST.has(key) && key[0] !== "_";
    }
    function getKeys(node) {
      return Object.keys(node).filter(filterKey);
    }
    function unionWith(additionalKeys) {
      const retv = (
        /** @type {{
            [type: string]: ReadonlyArray<string>
        }} */
        Object.assign({}, KEYS)
      );
      for (const type of Object.keys(additionalKeys)) {
        if (Object.prototype.hasOwnProperty.call(retv, type)) {
          const keys = new Set(additionalKeys[type]);
          for (const key of retv[type]) {
            keys.add(key);
          }
          retv[type] = Object.freeze(Array.from(keys));
        } else {
          retv[type] = Object.freeze(Array.from(additionalKeys[type]));
        }
      }
      return Object.freeze(retv);
    }
    exports2.KEYS = KEYS;
    exports2.getKeys = getKeys;
    exports2.unionWith = unionWith;
  }
});

// node_modules/toml-eslint-parser/lib/visitor-keys.js
var require_visitor_keys = __commonJS({
  "node_modules/toml-eslint-parser/lib/visitor-keys.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.KEYS = void 0;
    var eslint_visitor_keys_1 = require_eslint_visitor_keys();
    var tomlKeys = {
      Program: ["body"],
      TOMLTopLevelTable: ["body"],
      TOMLTable: ["key", "body"],
      TOMLKeyValue: ["key", "value"],
      TOMLKey: ["keys"],
      TOMLArray: ["elements"],
      TOMLInlineTable: ["body"],
      TOMLBare: [],
      TOMLQuoted: [],
      TOMLValue: []
    };
    exports2.KEYS = (0, eslint_visitor_keys_1.unionWith)(tomlKeys);
  }
});

// node_modules/toml-eslint-parser/lib/parser.js
var require_parser2 = __commonJS({
  "node_modules/toml-eslint-parser/lib/parser.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.parseForESLint = parseForESLint;
    var toml_parser_1 = require_toml_parser2();
    var visitor_keys_1 = require_visitor_keys();
    function parseForESLint(code, options) {
      const parser = new toml_parser_1.TOMLParser(code, options);
      const ast = parser.parse();
      return {
        ast,
        visitorKeys: visitor_keys_1.KEYS,
        services: {
          isTOML: true
        }
      };
    }
  }
});

// node_modules/toml-eslint-parser/lib/traverse.js
var require_traverse = __commonJS({
  "node_modules/toml-eslint-parser/lib/traverse.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getFallbackKeys = getFallbackKeys;
    exports2.getKeys = getKeys;
    exports2.getNodes = getNodes;
    exports2.traverseNodes = traverseNodes;
    var visitor_keys_1 = require_visitor_keys();
    function fallbackKeysFilter(key) {
      let value = null;
      return key !== "comments" && key !== "leadingComments" && key !== "loc" && key !== "parent" && key !== "range" && key !== "tokens" && key !== "trailingComments" && (value = this[key]) !== null && typeof value === "object" && (typeof value.type === "string" || Array.isArray(value));
    }
    function getFallbackKeys(node) {
      return Object.keys(node).filter(fallbackKeysFilter, node);
    }
    function getKeys(node, visitorKeys) {
      const keys = (visitorKeys || visitor_keys_1.KEYS)[node.type] || getFallbackKeys(node);
      return keys.filter((key) => !getNodes(node, key).next().done);
    }
    function* getNodes(node, key) {
      const child = node[key];
      if (Array.isArray(child)) {
        for (const c of child) {
          if (isNode(c)) {
            yield c;
          }
        }
      } else if (isNode(child)) {
        yield child;
      }
    }
    function isNode(x) {
      return x !== null && typeof x === "object" && typeof x.type === "string";
    }
    function traverse(node, parent, visitor) {
      visitor.enterNode(node, parent);
      const keys = getKeys(node, visitor.visitorKeys);
      for (const key of keys) {
        for (const child of getNodes(node, key)) {
          traverse(child, node, visitor);
        }
      }
      visitor.leaveNode(node, parent);
    }
    function traverseNodes(node, visitor) {
      traverse(node, null, visitor);
    }
  }
});

// node_modules/toml-eslint-parser/lib/utils.js
var require_utils = __commonJS({
  "node_modules/toml-eslint-parser/lib/utils.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getStaticTOMLValue = void 0;
    exports2.generateConvertTOMLValue = generateConvertTOMLValue;
    var internal_utils_1 = require_internal_utils();
    exports2.getStaticTOMLValue = generateConvertTOMLValue((node) => node.value);
    function generateConvertTOMLValue(convertValue) {
      function resolveValue(node, baseTable) {
        return resolver[node.type](node, baseTable);
      }
      const resolver = {
        Program(node, baseTable = {}) {
          return resolveValue(node.body[0], baseTable);
        },
        TOMLTopLevelTable(node, baseTable = {}) {
          for (const body of node.body) {
            resolveValue(body, baseTable);
          }
          return baseTable;
        },
        TOMLKeyValue(node, baseTable = {}) {
          const value = resolveValue(node.value);
          set(baseTable, resolveValue(node.key), value);
          return baseTable;
        },
        TOMLTable(node, baseTable = {}) {
          const table = getTable(baseTable, resolveValue(node.key), node.kind === "array");
          for (const body of node.body) {
            resolveValue(body, table);
          }
          return baseTable;
        },
        TOMLArray(node) {
          return node.elements.map((e) => resolveValue(e));
        },
        TOMLInlineTable(node) {
          const table = {};
          for (const body of node.body) {
            resolveValue(body, table);
          }
          return table;
        },
        TOMLKey(node) {
          return node.keys.map((key) => resolveValue(key));
        },
        TOMLBare(node) {
          return node.name;
        },
        TOMLQuoted(node) {
          return node.value;
        },
        TOMLValue(node) {
          return convertValue(node);
        }
      };
      return (node) => resolveValue(node);
    }
    function getTable(baseTable, keys, array) {
      let target = baseTable;
      for (let index = 0; index < keys.length - 1; index++) {
        const key = keys[index];
        target = getNextTargetFromKey(target, key);
      }
      const lastKey = (0, internal_utils_1.last)(keys);
      const lastTarget = target[lastKey];
      if (lastTarget == null) {
        const tableValue2 = {};
        target[lastKey] = array ? [tableValue2] : tableValue2;
        return tableValue2;
      }
      if (isValue(lastTarget)) {
        const tableValue2 = {};
        target[lastKey] = array ? [tableValue2] : tableValue2;
        return tableValue2;
      }
      if (!array) {
        if (Array.isArray(lastTarget)) {
          const tableValue2 = {};
          target[lastKey] = tableValue2;
          return tableValue2;
        }
        return lastTarget;
      }
      if (Array.isArray(lastTarget)) {
        const tableValue2 = {};
        lastTarget.push(tableValue2);
        return tableValue2;
      }
      const tableValue = {};
      target[lastKey] = [tableValue];
      return tableValue;
      function getNextTargetFromKey(currTarget, key) {
        const nextTarget = currTarget[key];
        if (nextTarget == null) {
          const val = {};
          currTarget[key] = val;
          return val;
        }
        if (isValue(nextTarget)) {
          const val = {};
          currTarget[key] = val;
          return val;
        }
        let resultTarget = nextTarget;
        while (Array.isArray(resultTarget)) {
          const lastIndex = resultTarget.length - 1;
          const nextElement = resultTarget[lastIndex];
          if (isValue(nextElement)) {
            const val = {};
            resultTarget[lastIndex] = val;
            return val;
          }
          resultTarget = nextElement;
        }
        return resultTarget;
      }
    }
    function set(baseTable, keys, value) {
      let target = baseTable;
      for (let index = 0; index < keys.length - 1; index++) {
        const key = keys[index];
        const nextTarget = target[key];
        if (nextTarget == null) {
          const val = {};
          target[key] = val;
          target = val;
        } else {
          if (isValue(nextTarget) || Array.isArray(nextTarget)) {
            const val = {};
            target[key] = val;
            target = val;
          } else {
            target = nextTarget;
          }
        }
      }
      target[(0, internal_utils_1.last)(keys)] = value;
    }
    function isValue(value) {
      return typeof value !== "object" || value instanceof Date;
    }
  }
});

// node_modules/toml-eslint-parser/lib/meta.js
var require_meta = __commonJS({
  "node_modules/toml-eslint-parser/lib/meta.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.version = exports2.name = void 0;
    exports2.name = "toml-eslint-parser";
    exports2.version = "0.12.0";
  }
});

// node_modules/toml-eslint-parser/lib/index.js
var require_lib = __commonJS({
  "node_modules/toml-eslint-parser/lib/index.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    }();
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getStaticTOMLValue = exports2.traverseNodes = exports2.VisitorKeys = exports2.parseForESLint = exports2.ParseError = exports2.name = exports2.meta = void 0;
    exports2.parseTOML = parseTOML2;
    var parser_1 = require_parser2();
    Object.defineProperty(exports2, "parseForESLint", { enumerable: true, get: function() {
      return parser_1.parseForESLint;
    } });
    var traverse_1 = require_traverse();
    Object.defineProperty(exports2, "traverseNodes", { enumerable: true, get: function() {
      return traverse_1.traverseNodes;
    } });
    var utils_1 = require_utils();
    Object.defineProperty(exports2, "getStaticTOMLValue", { enumerable: true, get: function() {
      return utils_1.getStaticTOMLValue;
    } });
    var visitor_keys_1 = require_visitor_keys();
    var errors_1 = require_errors();
    Object.defineProperty(exports2, "ParseError", { enumerable: true, get: function() {
      return errors_1.ParseError;
    } });
    exports2.meta = __importStar(require_meta());
    var meta_1 = require_meta();
    Object.defineProperty(exports2, "name", { enumerable: true, get: function() {
      return meta_1.name;
    } });
    exports2.VisitorKeys = visitor_keys_1.KEYS;
    function parseTOML2(code, options) {
      return (0, parser_1.parseForESLint)(code, options).ast;
    }
  }
});

// tools/config-toml-ops.source.cjs
var { mkdirSync, readFileSync, writeFileSync, existsSync } = require("node:fs");
var { dirname, resolve } = require("node:path");
var process = require("node:process");
var TOML = require_toml();
var { parseTOML } = require_lib();
var minimumNodeMajorVersion = 18;
var preferredTopLevelKeyOrder = [
  "model",
  "model_reasoning_effort"
];
var configTomlPolicy = {
  syncExcludedInstallPreservedNestedPaths: [
    ["features", "workspace_dependencies"],
    ["features", "apps"]
  ],
  sync: {
    topLevelAllowlistSource: "managed/config.toml",
    excludedTopLevelKeys: [
      "projects",
      "model",
      "model_context_window",
      "model_reasoning_effort",
      "model_catalog_json",
      "service_tier",
      "plan_mode_reasoning_effort",
      "apps"
    ],
    excludedNestedPaths: [
      ["notice", "model_migrations"],
      ["sandbox_workspace_write", "writable_roots"],
      ["tui", "model_availability_nux"]
    ],
    childAllowlistedTables: [
      "mcp_servers"
    ]
  },
  install: {
    defaultTopLevelMerge: {
      sourceDefinedAction: "replace",
      targetOnlyAction: "preserve"
    },
    preservedTopLevelKeys: [
      "service_tier",
      "plan_mode_reasoning_effort"
    ],
    preservedTopLevelTables: [
      "projects"
    ],
    preservedNestedPaths: [
      ["sandbox_workspace_write", "writable_roots"]
    ],
    removedTopLevelKeys: [
      "model_context_window"
    ],
    removedNestedPaths: [
      ["notice", "model_migrations"]
    ],
    namedChildMergedTables: [
      "mcp_servers"
    ]
  }
};
configTomlPolicy.sync.excludedNestedPaths.push(...configTomlPolicy.syncExcludedInstallPreservedNestedPaths);
configTomlPolicy.install.preservedNestedPaths.push(...configTomlPolicy.syncExcludedInstallPreservedNestedPaths);
var installPreservedTopLevelKeys = new Set(configTomlPolicy.install.preservedTopLevelKeys);
var installPreservedTopLevelTables = new Set(configTomlPolicy.install.preservedTopLevelTables);
var partiallyManagedTopLevelTables = new Set(configTomlPolicy.install.namedChildMergedTables);
var syncAllowlistedChildTables = new Set(configTomlPolicy.sync.childAllowlistedTables);
var syncExcludedTopLevelKeys = new Set(configTomlPolicy.sync.excludedTopLevelKeys);
var installRemovedTopLevelKeys = new Set(configTomlPolicy.install.removedTopLevelKeys);
var installRemovedNestedPaths = configTomlPolicy.install.removedNestedPaths;
var syncExcludedInstallPreservedNestedPaths = configTomlPolicy.syncExcludedInstallPreservedNestedPaths;
var installPreservedNestedPaths = configTomlPolicy.install.preservedNestedPaths;
var syncExcludedNestedPaths = configTomlPolicy.sync.excludedNestedPaths;
function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}
function ensureSupportedNodeVersion() {
  const majorVersion = Number.parseInt(process.versions.node.split(".")[0], 10);
  if (Number.isNaN(majorVersion) || majorVersion < minimumNodeMajorVersion) {
    throw new Error(`Node.js ${minimumNodeMajorVersion}+ is required. Found ${process.version}.`);
  }
}
function parseArguments(argv) {
  if (argv.length === 0) {
    throw new Error("Missing command. Expected merge-install or publish-sync.");
  }
  const [command, ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }
    const key = token.slice(2);
    const value = rest[index + 1];
    if (typeof value === "undefined" || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    options[key] = value;
    index += 1;
  }
  return { command, options };
}
function readTomlFile(filePath, { allowMissing = false } = {}) {
  const resolvedPath = resolve(filePath);
  if (!existsSync(resolvedPath)) {
    if (allowMissing) {
      return {};
    }
    throw new Error(`TOML file was not found: ${resolvedPath}`);
  }
  const content = readFileSync(resolvedPath, "utf8");
  try {
    return normalizeDeveloperInstructionNewlines(TOML.parse(content));
  } catch (error) {
    throw new Error(`Failed to parse TOML from ${resolvedPath}: ${error.message}`);
  }
}
function normalizeDeveloperInstructionNewlines(value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      normalizeDeveloperInstructionNewlines(item);
    }
    return value;
  }
  if (!isTomlObject(value)) {
    return value;
  }
  for (const key of Object.keys(value)) {
    if (key === "developer_instructions" && typeof value[key] === "string") {
      value[key] = value[key].replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      continue;
    }
    normalizeDeveloperInstructionNewlines(value[key]);
  }
  return value;
}
function writeTomlFile(filePath, value) {
  const resolvedPath = resolve(filePath);
  mkdirSync(dirname(resolvedPath), { recursive: true });
  const content = TOML.stringify(orderTopLevelKeys(value));
  writeFileSync(resolvedPath, content, "utf8");
}
function readTomlSourceText(filePath, { allowMissing = false } = {}) {
  const resolvedPath = resolve(filePath);
  if (!existsSync(resolvedPath)) {
    if (allowMissing) {
      return null;
    }
    throw new Error(`TOML file was not found: ${resolvedPath}`);
  }
  return readFileSync(resolvedPath, "utf8");
}
function writeMergeInstallTomlFile({ outputPath, sourceConfig, targetConfig, targetText }) {
  const mergedConfig = buildMergeInstallConfig(sourceConfig, targetConfig);
  const content = buildMergeInstallTomlContent({
    sourceConfig,
    mergedConfig,
    targetConfig,
    targetText
  });
  const resolvedPath = resolve(outputPath);
  mkdirSync(dirname(resolvedPath), { recursive: true });
  writeFileSync(resolvedPath, content, "utf8");
}
function buildMergeInstallTomlContent({ sourceConfig, mergedConfig, targetConfig = {}, targetText }) {
  const sourceContribution = buildMergeInstallSourceContribution(sourceConfig, mergedConfig, targetConfig);
  const managedContent = TOML.stringify(orderTopLevelKeys(sourceContribution));
  if (targetText === null || targetText.length === 0) {
    return managedContent;
  }
  const preservedTargetSections = collectPreservedTargetTomlSections(targetText, sourceConfig, targetConfig, mergedConfig);
  if (preservedTargetSections.preferredRoot.length === 0 && preservedTargetSections.root.length === 0 && preservedTargetSections.tables.length === 0) {
    return managedContent;
  }
  const managedSections = splitTomlRootAndTableContent(managedContent);
  const preservedRootContent = `${preservedTargetSections.preferredRoot}${preservedTargetSections.root}`;
  const rootContent = preservedRootContent.length === 0 ? managedSections.root : `${preservedTargetSections.preferredRoot}${removeTrailingBlankLines(managedSections.root)}${preservedTargetSections.root}`;
  const tableContent = `${managedSections.tables}${preservedTargetSections.tables}`;
  if (rootContent.length === 0) {
    return tableContent;
  }
  if (tableContent.length === 0) {
    return rootContent;
  }
  return `${rootContent}${rootContent.endsWith("\n") ? "\n" : "\n\n"}${tableContent}`;
}
function buildMergeInstallSourceContribution(sourceConfig, mergedConfig, targetConfig = {}) {
  const contribution = {};
  for (const key of Object.keys(sourceConfig)) {
    if (canPreserveTomlValue(targetConfig, mergedConfig, key)) {
      continue;
    }
    if (installPreservedTopLevelTables.has(key) || installRemovedTopLevelKeys.has(key) || installPreservedTopLevelKeys.has(key)) {
      continue;
    }
    if (partiallyManagedTopLevelTables.has(key) && isTomlObject(sourceConfig[key])) {
      const managedChildren = {};
      for (const childKey of Object.keys(sourceConfig[key])) {
        if (!isTomlObject(mergedConfig[key]) || !hasOwn(mergedConfig[key], childKey)) {
          continue;
        }
        managedChildren[childKey] = mergedConfig[key][childKey];
      }
      contribution[key] = managedChildren;
      continue;
    }
    if (hasOwn(mergedConfig, key)) {
      contribution[key] = mergedConfig[key];
    }
  }
  for (const key of preferredTopLevelKeyOrder) {
    if (!hasOwn(contribution, key) && hasOwn(mergedConfig, key) && !canPreserveTomlValue(targetConfig, mergedConfig, key)) {
      contribution[key] = mergedConfig[key];
    }
  }
  return contribution;
}
function canPreserveTomlValue(targetConfig, mergedConfig, pathSegment) {
  return hasOwn(targetConfig, pathSegment) && hasOwn(mergedConfig, pathSegment) && tomlValuesEqual(targetConfig[pathSegment], mergedConfig[pathSegment]);
}
function collectPreservedTargetTomlContent(targetText, sourceConfig, targetConfig = {}, mergedConfig = targetConfig) {
  const sections = collectPreservedTargetTomlSections(targetText, sourceConfig, targetConfig, mergedConfig);
  return `${sections.preferredRoot}${sections.root}${sections.tables}`;
}
function collectPreservedTargetTomlSections(targetText, sourceConfig, targetConfig, mergedConfig) {
  let targetAst;
  try {
    targetAst = parseTOML(targetText);
  } catch (error) {
    throw new Error(`Failed to parse target TOML syntax for syntax-preserving merge: ${error.message}`);
  }
  const nodes = targetAst.body[0].body;
  const preservedNodes = nodes.map((node) => shouldPreserveTargetTomlNode(node, sourceConfig, targetConfig, mergedConfig));
  let rootContent = "";
  let preferredRootContent = "";
  let tableContent = "";
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (!preservedNodes[index] || node.type !== "TOMLKeyValue") {
      continue;
    }
    const nodeContent = `${getTomlNodeLeadingComment(targetText, nodes[index - 1], node)}${targetText.slice(node.range[0], findTomlLineEnd(targetText, node.range[1]))}`;
    if (preferredTopLevelKeyOrder.includes(getTomlNodePath(node)[0])) {
      preferredRootContent += nodeContent;
    } else {
      rootContent += nodeContent;
    }
  }
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (!preservedNodes[index] || node.type !== "TOMLTable" || nodes[index - 1] && nodes[index - 1].type === "TOMLTable" && preservedNodes[index - 1]) {
      continue;
    }
    let lastPreservedIndex = index;
    while (nodes[lastPreservedIndex + 1] && nodes[lastPreservedIndex + 1].type === "TOMLTable" && preservedNodes[lastPreservedIndex + 1]) {
      lastPreservedIndex += 1;
    }
    const previousNode = nodes[index - 1];
    const nextNode = nodes[lastPreservedIndex + 1];
    const start = previousNode ? previousNode.range[1] : 0;
    const end = nextNode ? nextNode.range[0] : targetText.length;
    tableContent += targetText.slice(start, end);
  }
  return { preferredRoot: preferredRootContent, root: rootContent, tables: tableContent };
}
function splitTomlRootAndTableContent(content) {
  if (content.length === 0) {
    return { root: "", tables: "" };
  }
  const ast = parseTOML(content);
  const firstTable = ast.body[0].body.find((node) => node.type === "TOMLTable");
  if (!firstTable) {
    return { root: content, tables: "" };
  }
  return {
    root: content.slice(0, firstTable.range[0]),
    tables: content.slice(firstTable.range[0])
  };
}
function removeTrailingBlankLines(content) {
  return content.replace(/(?:\r?\n){2,}$/, "\n");
}
function findTomlLineEnd(content, offset) {
  const lineBreak = /\r?\n/.exec(content.slice(offset));
  return lineBreak ? offset + lineBreak.index + lineBreak[0].length : content.length;
}
function getTomlNodeLeadingComment(content, previousNode, node) {
  const start = previousNode ? findTomlLineEnd(content, previousNode.range[1]) : 0;
  const trivia = content.slice(start, node.range[0]);
  return /#[^\r\n]*/.test(trivia) ? trivia : "";
}
function shouldPreserveTargetTomlNode(node, sourceConfig, targetConfig, mergedConfig) {
  const pathSegments = getTomlNodePath(node);
  if (pathSegments.length === 0) {
    return false;
  }
  const [topLevelKey, childKey] = pathSegments;
  if (isRemovedTomlPath(pathSegments)) {
    return false;
  }
  const targetValue = getTomlPathValue(targetConfig, pathSegments);
  const mergedValue = getTomlPathValue(mergedConfig, pathSegments);
  if (typeof targetValue !== "undefined" && typeof mergedValue !== "undefined" && tomlValuesEqual(targetValue, mergedValue)) {
    return true;
  }
  if (installRemovedTopLevelKeys.has(topLevelKey)) {
    return false;
  }
  if (installPreservedTopLevelKeys.has(topLevelKey) || installPreservedTopLevelTables.has(topLevelKey)) {
    return true;
  }
  if (!hasOwn(sourceConfig, topLevelKey)) {
    return true;
  }
  if (!partiallyManagedTopLevelTables.has(topLevelKey)) {
    return false;
  }
  if (typeof childKey === "undefined") {
    return false;
  }
  return !isTomlObject(sourceConfig[topLevelKey]) || !hasOwn(sourceConfig[topLevelKey], childKey);
}
function isRemovedTomlPath(pathSegments) {
  return installRemovedNestedPaths.some((removedPath) => {
    if (pathSegments.length < removedPath.length) {
      return false;
    }
    return removedPath.every((segment, index) => pathSegments[index] === segment);
  });
}
function getTomlPathValue(config, pathSegments) {
  let currentValue = config;
  for (const segment of pathSegments) {
    if (currentValue === null || typeof currentValue !== "object" || !hasOwn(currentValue, segment)) {
      return void 0;
    }
    currentValue = currentValue[segment];
  }
  return currentValue;
}
function tomlValuesEqual(leftValue, rightValue) {
  if (leftValue === rightValue) {
    return true;
  }
  if (Array.isArray(leftValue) || Array.isArray(rightValue)) {
    if (!Array.isArray(leftValue) || !Array.isArray(rightValue) || leftValue.length !== rightValue.length) {
      return false;
    }
    return leftValue.every((value, index) => tomlValuesEqual(value, rightValue[index]));
  }
  if (isTomlObject(leftValue) || isTomlObject(rightValue)) {
    if (!isTomlObject(leftValue) || !isTomlObject(rightValue)) {
      return false;
    }
    const leftKeys = Object.keys(leftValue).sort();
    const rightKeys = Object.keys(rightValue).sort();
    if (leftKeys.length !== rightKeys.length || leftKeys.some((key, index) => key !== rightKeys[index])) {
      return false;
    }
    return leftKeys.every((key) => tomlValuesEqual(leftValue[key], rightValue[key]));
  }
  return false;
}
function getTomlNodePath(node) {
  if (node.type === "TOMLTable") {
    return node.resolvedKey.filter((segment) => typeof segment === "string");
  }
  if (node.type === "TOMLKeyValue") {
    return node.key.keys.map((key) => key.type === "TOMLQuoted" ? key.value : key.name);
  }
  return [];
}
function orderTopLevelKeys(config) {
  const orderedConfig = {};
  for (const key of preferredTopLevelKeyOrder) {
    if (hasOwn(config, key)) {
      orderedConfig[key] = config[key];
    }
  }
  for (const key of Object.keys(config)) {
    if (hasOwn(orderedConfig, key)) {
      continue;
    }
    orderedConfig[key] = config[key];
  }
  return orderedConfig;
}
function isTomlObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function mergeNamedChildEntries(preferredValue, fallbackValue) {
  if (!isTomlObject(preferredValue) || !isTomlObject(fallbackValue)) {
    return preferredValue;
  }
  const mergedValue = {};
  for (const key of Object.keys(preferredValue)) {
    mergedValue[key] = preferredValue[key];
  }
  for (const key of Object.keys(fallbackValue)) {
    if (hasOwn(preferredValue, key)) {
      continue;
    }
    mergedValue[key] = fallbackValue[key];
  }
  return mergedValue;
}
function pickNamedChildEntriesByAllowlist(candidateValue, allowlistValue) {
  if (!isTomlObject(candidateValue) || !isTomlObject(allowlistValue)) {
    return candidateValue;
  }
  const filteredValue = {};
  for (const key of Object.keys(candidateValue)) {
    if (!hasOwn(allowlistValue, key)) {
      continue;
    }
    filteredValue[key] = candidateValue[key];
  }
  return filteredValue;
}
function buildMergeInstallConfig(sourceConfig, targetConfig) {
  const mergedConfig = {};
  for (const key of Object.keys(sourceConfig)) {
    if (installPreservedTopLevelTables.has(key) || installRemovedTopLevelKeys.has(key) || installPreservedTopLevelKeys.has(key)) {
      continue;
    }
    if (partiallyManagedTopLevelTables.has(key) && hasOwn(targetConfig, key)) {
      mergedConfig[key] = mergeNamedChildEntries(sourceConfig[key], targetConfig[key]);
      continue;
    }
    mergedConfig[key] = sourceConfig[key];
  }
  for (const key of Object.keys(targetConfig)) {
    if (installPreservedTopLevelTables.has(key) || installRemovedTopLevelKeys.has(key)) {
      continue;
    }
    if (installPreservedTopLevelKeys.has(key)) {
      mergedConfig[key] = targetConfig[key];
      continue;
    }
    if (hasOwn(sourceConfig, key)) {
      continue;
    }
    mergedConfig[key] = targetConfig[key];
  }
  for (const tableName of installPreservedTopLevelTables) {
    if (hasOwn(targetConfig, tableName)) {
      mergedConfig[tableName] = targetConfig[tableName];
    }
  }
  preserveNestedPaths(mergedConfig, targetConfig, installPreservedNestedPaths);
  removeNestedPaths(mergedConfig, installRemovedNestedPaths);
  return mergedConfig;
}
function buildPublishedSyncConfig(localConfig, managedConfig) {
  const publishedConfig = {};
  const managedTopLevelKeys = new Set(Object.keys(managedConfig));
  for (const key of Object.keys(localConfig)) {
    if (!managedTopLevelKeys.has(key) || syncExcludedTopLevelKeys.has(key)) {
      continue;
    }
    if (syncAllowlistedChildTables.has(key)) {
      const managedAllowlist = isTomlObject(managedConfig[key]) ? managedConfig[key] : {};
      publishedConfig[key] = pickNamedChildEntriesByAllowlist(localConfig[key], managedAllowlist);
      continue;
    }
    publishedConfig[key] = localConfig[key];
  }
  removeNestedPaths(publishedConfig, syncExcludedNestedPaths);
  return publishedConfig;
}
function removeNestedPaths(config, nestedPaths) {
  for (const pathSegments of nestedPaths) {
    removeNestedPath(config, pathSegments);
  }
}
function preserveNestedPaths(destinationConfig, sourceConfig, nestedPaths) {
  for (const pathSegments of nestedPaths) {
    preserveNestedPath(destinationConfig, sourceConfig, pathSegments);
  }
}
function preserveNestedPath(destinationConfig, sourceConfig, pathSegments) {
  if (pathSegments.length < 2) {
    return;
  }
  const sourceValue = readNestedPath(sourceConfig, pathSegments);
  if (typeof sourceValue === "undefined") {
    removeNestedPath(destinationConfig, pathSegments);
    return;
  }
  writeNestedPath(destinationConfig, pathSegments, sourceValue);
}
function removeNestedPath(config, pathSegments) {
  if (pathSegments.length === 0) {
    return;
  }
  const [topLevelKey, ...restPath] = pathSegments;
  if (!hasOwn(config, topLevelKey) || restPath.length === 0) {
    return;
  }
  if (config[topLevelKey] === null || typeof config[topLevelKey] !== "object") {
    return;
  }
  removeNestedPathFromObject(config, config[topLevelKey], topLevelKey, restPath);
}
function removeNestedPathFromObject(rootConfig, currentValue, currentKey, remainingPath) {
  if (remainingPath.length === 0) {
    return;
  }
  const [nextKey, ...restPath] = remainingPath;
  if (!hasOwn(currentValue, nextKey)) {
    return;
  }
  if (restPath.length === 0) {
    delete currentValue[nextKey];
  } else {
    const nextValue = currentValue[nextKey];
    if (nextValue === null || typeof nextValue !== "object") {
      return;
    }
    removeNestedPathFromObject(rootConfig, nextValue, nextKey, restPath);
    if (Object.keys(nextValue).length === 0) {
      delete currentValue[nextKey];
    }
  }
  if (Object.keys(currentValue).length === 0) {
    delete rootConfig[currentKey];
  }
}
function readNestedPath(config, pathSegments) {
  let currentValue = config;
  for (const pathSegment of pathSegments) {
    if (!isTomlObject(currentValue) || !hasOwn(currentValue, pathSegment)) {
      return void 0;
    }
    currentValue = currentValue[pathSegment];
  }
  return currentValue;
}
function writeNestedPath(config, pathSegments, value) {
  let currentValue = config;
  for (let index = 0; index < pathSegments.length - 1; index += 1) {
    const pathSegment = pathSegments[index];
    if (!isTomlObject(currentValue[pathSegment])) {
      currentValue[pathSegment] = {};
    }
    currentValue = currentValue[pathSegment];
  }
  currentValue[pathSegments[pathSegments.length - 1]] = value;
}
function mergeInstallConfig({ sourcePath, targetPath, outputPath }) {
  const sourceConfig = readTomlFile(sourcePath);
  const targetConfig = readTomlFile(targetPath, { allowMissing: true });
  const targetText = readTomlSourceText(targetPath, { allowMissing: true });
  writeMergeInstallTomlFile({
    outputPath,
    sourceConfig,
    targetConfig,
    targetText
  });
}
function publishSyncConfig({ localPath, managedPath, outputPath }) {
  const localConfig = readTomlFile(localPath);
  const managedConfig = readTomlFile(managedPath);
  const publishedConfig = buildPublishedSyncConfig(localConfig, managedConfig);
  writeTomlFile(outputPath, publishedConfig);
}
function runCli() {
  ensureSupportedNodeVersion();
  const { command, options } = parseArguments(process.argv.slice(2));
  switch (command) {
    case "merge-install":
      if (!options.source || !options.target || !options.output) {
        throw new Error("merge-install requires --source, --target, and --output.");
      }
      mergeInstallConfig({
        sourcePath: options.source,
        targetPath: options.target,
        outputPath: options.output
      });
      break;
    case "publish-sync":
      if (!options.local || !options.managed || !options.output) {
        throw new Error("publish-sync requires --local, --managed, and --output.");
      }
      publishSyncConfig({
        localPath: options.local,
        managedPath: options.managed,
        outputPath: options.output
      });
      break;
    default:
      throw new Error(`Unsupported command: ${command}`);
  }
}
module.exports = {
  buildMergeInstallConfig,
  buildMergeInstallTomlContent,
  buildPublishedSyncConfig,
  collectPreservedTargetTomlContent,
  configTomlPolicy,
  ensureSupportedNodeVersion,
  mergeInstallConfig,
  orderTopLevelKeys,
  parseArguments,
  publishSyncConfig,
  installRemovedTopLevelKeys,
  installRemovedNestedPaths,
  syncExcludedNestedPaths,
  syncExcludedTopLevelKeys,
  syncAllowlistedChildTables,
  installPreservedTopLevelKeys,
  syncExcludedInstallPreservedNestedPaths
};
if (require.main === module) {
  try {
    runCli();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
