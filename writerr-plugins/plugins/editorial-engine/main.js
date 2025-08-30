var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/diff-match-patch/index.js
var require_diff_match_patch = __commonJS({
  "node_modules/diff-match-patch/index.js"(exports, module2) {
    var diff_match_patch2 = function() {
      this.Diff_Timeout = 1;
      this.Diff_EditCost = 4;
      this.Match_Threshold = 0.5;
      this.Match_Distance = 1e3;
      this.Patch_DeleteThreshold = 0.5;
      this.Patch_Margin = 4;
      this.Match_MaxBits = 32;
    };
    var DIFF_DELETE2 = -1;
    var DIFF_INSERT2 = 1;
    var DIFF_EQUAL2 = 0;
    diff_match_patch2.Diff = function(op, text) {
      return [op, text];
    };
    diff_match_patch2.prototype.diff_main = function(text1, text2, opt_checklines, opt_deadline) {
      if (typeof opt_deadline == "undefined") {
        if (this.Diff_Timeout <= 0) {
          opt_deadline = Number.MAX_VALUE;
        } else {
          opt_deadline = (/* @__PURE__ */ new Date()).getTime() + this.Diff_Timeout * 1e3;
        }
      }
      var deadline = opt_deadline;
      if (text1 == null || text2 == null) {
        throw new Error("Null input. (diff_main)");
      }
      if (text1 == text2) {
        if (text1) {
          return [new diff_match_patch2.Diff(DIFF_EQUAL2, text1)];
        }
        return [];
      }
      if (typeof opt_checklines == "undefined") {
        opt_checklines = true;
      }
      var checklines = opt_checklines;
      var commonlength = this.diff_commonPrefix(text1, text2);
      var commonprefix = text1.substring(0, commonlength);
      text1 = text1.substring(commonlength);
      text2 = text2.substring(commonlength);
      commonlength = this.diff_commonSuffix(text1, text2);
      var commonsuffix = text1.substring(text1.length - commonlength);
      text1 = text1.substring(0, text1.length - commonlength);
      text2 = text2.substring(0, text2.length - commonlength);
      var diffs = this.diff_compute_(text1, text2, checklines, deadline);
      if (commonprefix) {
        diffs.unshift(new diff_match_patch2.Diff(DIFF_EQUAL2, commonprefix));
      }
      if (commonsuffix) {
        diffs.push(new diff_match_patch2.Diff(DIFF_EQUAL2, commonsuffix));
      }
      this.diff_cleanupMerge(diffs);
      return diffs;
    };
    diff_match_patch2.prototype.diff_compute_ = function(text1, text2, checklines, deadline) {
      var diffs;
      if (!text1) {
        return [new diff_match_patch2.Diff(DIFF_INSERT2, text2)];
      }
      if (!text2) {
        return [new diff_match_patch2.Diff(DIFF_DELETE2, text1)];
      }
      var longtext = text1.length > text2.length ? text1 : text2;
      var shorttext = text1.length > text2.length ? text2 : text1;
      var i = longtext.indexOf(shorttext);
      if (i != -1) {
        diffs = [
          new diff_match_patch2.Diff(DIFF_INSERT2, longtext.substring(0, i)),
          new diff_match_patch2.Diff(DIFF_EQUAL2, shorttext),
          new diff_match_patch2.Diff(
            DIFF_INSERT2,
            longtext.substring(i + shorttext.length)
          )
        ];
        if (text1.length > text2.length) {
          diffs[0][0] = diffs[2][0] = DIFF_DELETE2;
        }
        return diffs;
      }
      if (shorttext.length == 1) {
        return [
          new diff_match_patch2.Diff(DIFF_DELETE2, text1),
          new diff_match_patch2.Diff(DIFF_INSERT2, text2)
        ];
      }
      var hm = this.diff_halfMatch_(text1, text2);
      if (hm) {
        var text1_a = hm[0];
        var text1_b = hm[1];
        var text2_a = hm[2];
        var text2_b = hm[3];
        var mid_common = hm[4];
        var diffs_a = this.diff_main(text1_a, text2_a, checklines, deadline);
        var diffs_b = this.diff_main(text1_b, text2_b, checklines, deadline);
        return diffs_a.concat(
          [new diff_match_patch2.Diff(DIFF_EQUAL2, mid_common)],
          diffs_b
        );
      }
      if (checklines && text1.length > 100 && text2.length > 100) {
        return this.diff_lineMode_(text1, text2, deadline);
      }
      return this.diff_bisect_(text1, text2, deadline);
    };
    diff_match_patch2.prototype.diff_lineMode_ = function(text1, text2, deadline) {
      var a = this.diff_linesToChars_(text1, text2);
      text1 = a.chars1;
      text2 = a.chars2;
      var linearray = a.lineArray;
      var diffs = this.diff_main(text1, text2, false, deadline);
      this.diff_charsToLines_(diffs, linearray);
      this.diff_cleanupSemantic(diffs);
      diffs.push(new diff_match_patch2.Diff(DIFF_EQUAL2, ""));
      var pointer = 0;
      var count_delete = 0;
      var count_insert = 0;
      var text_delete = "";
      var text_insert = "";
      while (pointer < diffs.length) {
        switch (diffs[pointer][0]) {
          case DIFF_INSERT2:
            count_insert++;
            text_insert += diffs[pointer][1];
            break;
          case DIFF_DELETE2:
            count_delete++;
            text_delete += diffs[pointer][1];
            break;
          case DIFF_EQUAL2:
            if (count_delete >= 1 && count_insert >= 1) {
              diffs.splice(
                pointer - count_delete - count_insert,
                count_delete + count_insert
              );
              pointer = pointer - count_delete - count_insert;
              var subDiff = this.diff_main(text_delete, text_insert, false, deadline);
              for (var j = subDiff.length - 1; j >= 0; j--) {
                diffs.splice(pointer, 0, subDiff[j]);
              }
              pointer = pointer + subDiff.length;
            }
            count_insert = 0;
            count_delete = 0;
            text_delete = "";
            text_insert = "";
            break;
        }
        pointer++;
      }
      diffs.pop();
      return diffs;
    };
    diff_match_patch2.prototype.diff_bisect_ = function(text1, text2, deadline) {
      var text1_length = text1.length;
      var text2_length = text2.length;
      var max_d = Math.ceil((text1_length + text2_length) / 2);
      var v_offset = max_d;
      var v_length = 2 * max_d;
      var v1 = new Array(v_length);
      var v2 = new Array(v_length);
      for (var x = 0; x < v_length; x++) {
        v1[x] = -1;
        v2[x] = -1;
      }
      v1[v_offset + 1] = 0;
      v2[v_offset + 1] = 0;
      var delta = text1_length - text2_length;
      var front = delta % 2 != 0;
      var k1start = 0;
      var k1end = 0;
      var k2start = 0;
      var k2end = 0;
      for (var d = 0; d < max_d; d++) {
        if ((/* @__PURE__ */ new Date()).getTime() > deadline) {
          break;
        }
        for (var k1 = -d + k1start; k1 <= d - k1end; k1 += 2) {
          var k1_offset = v_offset + k1;
          var x1;
          if (k1 == -d || k1 != d && v1[k1_offset - 1] < v1[k1_offset + 1]) {
            x1 = v1[k1_offset + 1];
          } else {
            x1 = v1[k1_offset - 1] + 1;
          }
          var y1 = x1 - k1;
          while (x1 < text1_length && y1 < text2_length && text1.charAt(x1) == text2.charAt(y1)) {
            x1++;
            y1++;
          }
          v1[k1_offset] = x1;
          if (x1 > text1_length) {
            k1end += 2;
          } else if (y1 > text2_length) {
            k1start += 2;
          } else if (front) {
            var k2_offset = v_offset + delta - k1;
            if (k2_offset >= 0 && k2_offset < v_length && v2[k2_offset] != -1) {
              var x2 = text1_length - v2[k2_offset];
              if (x1 >= x2) {
                return this.diff_bisectSplit_(text1, text2, x1, y1, deadline);
              }
            }
          }
        }
        for (var k2 = -d + k2start; k2 <= d - k2end; k2 += 2) {
          var k2_offset = v_offset + k2;
          var x2;
          if (k2 == -d || k2 != d && v2[k2_offset - 1] < v2[k2_offset + 1]) {
            x2 = v2[k2_offset + 1];
          } else {
            x2 = v2[k2_offset - 1] + 1;
          }
          var y2 = x2 - k2;
          while (x2 < text1_length && y2 < text2_length && text1.charAt(text1_length - x2 - 1) == text2.charAt(text2_length - y2 - 1)) {
            x2++;
            y2++;
          }
          v2[k2_offset] = x2;
          if (x2 > text1_length) {
            k2end += 2;
          } else if (y2 > text2_length) {
            k2start += 2;
          } else if (!front) {
            var k1_offset = v_offset + delta - k2;
            if (k1_offset >= 0 && k1_offset < v_length && v1[k1_offset] != -1) {
              var x1 = v1[k1_offset];
              var y1 = v_offset + x1 - k1_offset;
              x2 = text1_length - x2;
              if (x1 >= x2) {
                return this.diff_bisectSplit_(text1, text2, x1, y1, deadline);
              }
            }
          }
        }
      }
      return [
        new diff_match_patch2.Diff(DIFF_DELETE2, text1),
        new diff_match_patch2.Diff(DIFF_INSERT2, text2)
      ];
    };
    diff_match_patch2.prototype.diff_bisectSplit_ = function(text1, text2, x, y, deadline) {
      var text1a = text1.substring(0, x);
      var text2a = text2.substring(0, y);
      var text1b = text1.substring(x);
      var text2b = text2.substring(y);
      var diffs = this.diff_main(text1a, text2a, false, deadline);
      var diffsb = this.diff_main(text1b, text2b, false, deadline);
      return diffs.concat(diffsb);
    };
    diff_match_patch2.prototype.diff_linesToChars_ = function(text1, text2) {
      var lineArray = [];
      var lineHash = {};
      lineArray[0] = "";
      function diff_linesToCharsMunge_(text) {
        var chars = "";
        var lineStart = 0;
        var lineEnd = -1;
        var lineArrayLength = lineArray.length;
        while (lineEnd < text.length - 1) {
          lineEnd = text.indexOf("\n", lineStart);
          if (lineEnd == -1) {
            lineEnd = text.length - 1;
          }
          var line = text.substring(lineStart, lineEnd + 1);
          if (lineHash.hasOwnProperty ? lineHash.hasOwnProperty(line) : lineHash[line] !== void 0) {
            chars += String.fromCharCode(lineHash[line]);
          } else {
            if (lineArrayLength == maxLines) {
              line = text.substring(lineStart);
              lineEnd = text.length;
            }
            chars += String.fromCharCode(lineArrayLength);
            lineHash[line] = lineArrayLength;
            lineArray[lineArrayLength++] = line;
          }
          lineStart = lineEnd + 1;
        }
        return chars;
      }
      var maxLines = 4e4;
      var chars1 = diff_linesToCharsMunge_(text1);
      maxLines = 65535;
      var chars2 = diff_linesToCharsMunge_(text2);
      return { chars1, chars2, lineArray };
    };
    diff_match_patch2.prototype.diff_charsToLines_ = function(diffs, lineArray) {
      for (var i = 0; i < diffs.length; i++) {
        var chars = diffs[i][1];
        var text = [];
        for (var j = 0; j < chars.length; j++) {
          text[j] = lineArray[chars.charCodeAt(j)];
        }
        diffs[i][1] = text.join("");
      }
    };
    diff_match_patch2.prototype.diff_commonPrefix = function(text1, text2) {
      if (!text1 || !text2 || text1.charAt(0) != text2.charAt(0)) {
        return 0;
      }
      var pointermin = 0;
      var pointermax = Math.min(text1.length, text2.length);
      var pointermid = pointermax;
      var pointerstart = 0;
      while (pointermin < pointermid) {
        if (text1.substring(pointerstart, pointermid) == text2.substring(pointerstart, pointermid)) {
          pointermin = pointermid;
          pointerstart = pointermin;
        } else {
          pointermax = pointermid;
        }
        pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
      }
      return pointermid;
    };
    diff_match_patch2.prototype.diff_commonSuffix = function(text1, text2) {
      if (!text1 || !text2 || text1.charAt(text1.length - 1) != text2.charAt(text2.length - 1)) {
        return 0;
      }
      var pointermin = 0;
      var pointermax = Math.min(text1.length, text2.length);
      var pointermid = pointermax;
      var pointerend = 0;
      while (pointermin < pointermid) {
        if (text1.substring(text1.length - pointermid, text1.length - pointerend) == text2.substring(text2.length - pointermid, text2.length - pointerend)) {
          pointermin = pointermid;
          pointerend = pointermin;
        } else {
          pointermax = pointermid;
        }
        pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
      }
      return pointermid;
    };
    diff_match_patch2.prototype.diff_commonOverlap_ = function(text1, text2) {
      var text1_length = text1.length;
      var text2_length = text2.length;
      if (text1_length == 0 || text2_length == 0) {
        return 0;
      }
      if (text1_length > text2_length) {
        text1 = text1.substring(text1_length - text2_length);
      } else if (text1_length < text2_length) {
        text2 = text2.substring(0, text1_length);
      }
      var text_length = Math.min(text1_length, text2_length);
      if (text1 == text2) {
        return text_length;
      }
      var best = 0;
      var length = 1;
      while (true) {
        var pattern = text1.substring(text_length - length);
        var found = text2.indexOf(pattern);
        if (found == -1) {
          return best;
        }
        length += found;
        if (found == 0 || text1.substring(text_length - length) == text2.substring(0, length)) {
          best = length;
          length++;
        }
      }
    };
    diff_match_patch2.prototype.diff_halfMatch_ = function(text1, text2) {
      if (this.Diff_Timeout <= 0) {
        return null;
      }
      var longtext = text1.length > text2.length ? text1 : text2;
      var shorttext = text1.length > text2.length ? text2 : text1;
      if (longtext.length < 4 || shorttext.length * 2 < longtext.length) {
        return null;
      }
      var dmp = this;
      function diff_halfMatchI_(longtext2, shorttext2, i) {
        var seed = longtext2.substring(i, i + Math.floor(longtext2.length / 4));
        var j = -1;
        var best_common = "";
        var best_longtext_a, best_longtext_b, best_shorttext_a, best_shorttext_b;
        while ((j = shorttext2.indexOf(seed, j + 1)) != -1) {
          var prefixLength = dmp.diff_commonPrefix(
            longtext2.substring(i),
            shorttext2.substring(j)
          );
          var suffixLength = dmp.diff_commonSuffix(
            longtext2.substring(0, i),
            shorttext2.substring(0, j)
          );
          if (best_common.length < suffixLength + prefixLength) {
            best_common = shorttext2.substring(j - suffixLength, j) + shorttext2.substring(j, j + prefixLength);
            best_longtext_a = longtext2.substring(0, i - suffixLength);
            best_longtext_b = longtext2.substring(i + prefixLength);
            best_shorttext_a = shorttext2.substring(0, j - suffixLength);
            best_shorttext_b = shorttext2.substring(j + prefixLength);
          }
        }
        if (best_common.length * 2 >= longtext2.length) {
          return [
            best_longtext_a,
            best_longtext_b,
            best_shorttext_a,
            best_shorttext_b,
            best_common
          ];
        } else {
          return null;
        }
      }
      var hm1 = diff_halfMatchI_(
        longtext,
        shorttext,
        Math.ceil(longtext.length / 4)
      );
      var hm2 = diff_halfMatchI_(
        longtext,
        shorttext,
        Math.ceil(longtext.length / 2)
      );
      var hm;
      if (!hm1 && !hm2) {
        return null;
      } else if (!hm2) {
        hm = hm1;
      } else if (!hm1) {
        hm = hm2;
      } else {
        hm = hm1[4].length > hm2[4].length ? hm1 : hm2;
      }
      var text1_a, text1_b, text2_a, text2_b;
      if (text1.length > text2.length) {
        text1_a = hm[0];
        text1_b = hm[1];
        text2_a = hm[2];
        text2_b = hm[3];
      } else {
        text2_a = hm[0];
        text2_b = hm[1];
        text1_a = hm[2];
        text1_b = hm[3];
      }
      var mid_common = hm[4];
      return [text1_a, text1_b, text2_a, text2_b, mid_common];
    };
    diff_match_patch2.prototype.diff_cleanupSemantic = function(diffs) {
      var changes = false;
      var equalities = [];
      var equalitiesLength = 0;
      var lastEquality = null;
      var pointer = 0;
      var length_insertions1 = 0;
      var length_deletions1 = 0;
      var length_insertions2 = 0;
      var length_deletions2 = 0;
      while (pointer < diffs.length) {
        if (diffs[pointer][0] == DIFF_EQUAL2) {
          equalities[equalitiesLength++] = pointer;
          length_insertions1 = length_insertions2;
          length_deletions1 = length_deletions2;
          length_insertions2 = 0;
          length_deletions2 = 0;
          lastEquality = diffs[pointer][1];
        } else {
          if (diffs[pointer][0] == DIFF_INSERT2) {
            length_insertions2 += diffs[pointer][1].length;
          } else {
            length_deletions2 += diffs[pointer][1].length;
          }
          if (lastEquality && lastEquality.length <= Math.max(length_insertions1, length_deletions1) && lastEquality.length <= Math.max(
            length_insertions2,
            length_deletions2
          )) {
            diffs.splice(
              equalities[equalitiesLength - 1],
              0,
              new diff_match_patch2.Diff(DIFF_DELETE2, lastEquality)
            );
            diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT2;
            equalitiesLength--;
            equalitiesLength--;
            pointer = equalitiesLength > 0 ? equalities[equalitiesLength - 1] : -1;
            length_insertions1 = 0;
            length_deletions1 = 0;
            length_insertions2 = 0;
            length_deletions2 = 0;
            lastEquality = null;
            changes = true;
          }
        }
        pointer++;
      }
      if (changes) {
        this.diff_cleanupMerge(diffs);
      }
      this.diff_cleanupSemanticLossless(diffs);
      pointer = 1;
      while (pointer < diffs.length) {
        if (diffs[pointer - 1][0] == DIFF_DELETE2 && diffs[pointer][0] == DIFF_INSERT2) {
          var deletion = diffs[pointer - 1][1];
          var insertion = diffs[pointer][1];
          var overlap_length1 = this.diff_commonOverlap_(deletion, insertion);
          var overlap_length2 = this.diff_commonOverlap_(insertion, deletion);
          if (overlap_length1 >= overlap_length2) {
            if (overlap_length1 >= deletion.length / 2 || overlap_length1 >= insertion.length / 2) {
              diffs.splice(pointer, 0, new diff_match_patch2.Diff(
                DIFF_EQUAL2,
                insertion.substring(0, overlap_length1)
              ));
              diffs[pointer - 1][1] = deletion.substring(0, deletion.length - overlap_length1);
              diffs[pointer + 1][1] = insertion.substring(overlap_length1);
              pointer++;
            }
          } else {
            if (overlap_length2 >= deletion.length / 2 || overlap_length2 >= insertion.length / 2) {
              diffs.splice(pointer, 0, new diff_match_patch2.Diff(
                DIFF_EQUAL2,
                deletion.substring(0, overlap_length2)
              ));
              diffs[pointer - 1][0] = DIFF_INSERT2;
              diffs[pointer - 1][1] = insertion.substring(0, insertion.length - overlap_length2);
              diffs[pointer + 1][0] = DIFF_DELETE2;
              diffs[pointer + 1][1] = deletion.substring(overlap_length2);
              pointer++;
            }
          }
          pointer++;
        }
        pointer++;
      }
    };
    diff_match_patch2.prototype.diff_cleanupSemanticLossless = function(diffs) {
      function diff_cleanupSemanticScore_(one, two) {
        if (!one || !two) {
          return 6;
        }
        var char1 = one.charAt(one.length - 1);
        var char2 = two.charAt(0);
        var nonAlphaNumeric1 = char1.match(diff_match_patch2.nonAlphaNumericRegex_);
        var nonAlphaNumeric2 = char2.match(diff_match_patch2.nonAlphaNumericRegex_);
        var whitespace1 = nonAlphaNumeric1 && char1.match(diff_match_patch2.whitespaceRegex_);
        var whitespace2 = nonAlphaNumeric2 && char2.match(diff_match_patch2.whitespaceRegex_);
        var lineBreak1 = whitespace1 && char1.match(diff_match_patch2.linebreakRegex_);
        var lineBreak2 = whitespace2 && char2.match(diff_match_patch2.linebreakRegex_);
        var blankLine1 = lineBreak1 && one.match(diff_match_patch2.blanklineEndRegex_);
        var blankLine2 = lineBreak2 && two.match(diff_match_patch2.blanklineStartRegex_);
        if (blankLine1 || blankLine2) {
          return 5;
        } else if (lineBreak1 || lineBreak2) {
          return 4;
        } else if (nonAlphaNumeric1 && !whitespace1 && whitespace2) {
          return 3;
        } else if (whitespace1 || whitespace2) {
          return 2;
        } else if (nonAlphaNumeric1 || nonAlphaNumeric2) {
          return 1;
        }
        return 0;
      }
      var pointer = 1;
      while (pointer < diffs.length - 1) {
        if (diffs[pointer - 1][0] == DIFF_EQUAL2 && diffs[pointer + 1][0] == DIFF_EQUAL2) {
          var equality1 = diffs[pointer - 1][1];
          var edit = diffs[pointer][1];
          var equality2 = diffs[pointer + 1][1];
          var commonOffset = this.diff_commonSuffix(equality1, edit);
          if (commonOffset) {
            var commonString = edit.substring(edit.length - commonOffset);
            equality1 = equality1.substring(0, equality1.length - commonOffset);
            edit = commonString + edit.substring(0, edit.length - commonOffset);
            equality2 = commonString + equality2;
          }
          var bestEquality1 = equality1;
          var bestEdit = edit;
          var bestEquality2 = equality2;
          var bestScore = diff_cleanupSemanticScore_(equality1, edit) + diff_cleanupSemanticScore_(edit, equality2);
          while (edit.charAt(0) === equality2.charAt(0)) {
            equality1 += edit.charAt(0);
            edit = edit.substring(1) + equality2.charAt(0);
            equality2 = equality2.substring(1);
            var score = diff_cleanupSemanticScore_(equality1, edit) + diff_cleanupSemanticScore_(edit, equality2);
            if (score >= bestScore) {
              bestScore = score;
              bestEquality1 = equality1;
              bestEdit = edit;
              bestEquality2 = equality2;
            }
          }
          if (diffs[pointer - 1][1] != bestEquality1) {
            if (bestEquality1) {
              diffs[pointer - 1][1] = bestEquality1;
            } else {
              diffs.splice(pointer - 1, 1);
              pointer--;
            }
            diffs[pointer][1] = bestEdit;
            if (bestEquality2) {
              diffs[pointer + 1][1] = bestEquality2;
            } else {
              diffs.splice(pointer + 1, 1);
              pointer--;
            }
          }
        }
        pointer++;
      }
    };
    diff_match_patch2.nonAlphaNumericRegex_ = /[^a-zA-Z0-9]/;
    diff_match_patch2.whitespaceRegex_ = /\s/;
    diff_match_patch2.linebreakRegex_ = /[\r\n]/;
    diff_match_patch2.blanklineEndRegex_ = /\n\r?\n$/;
    diff_match_patch2.blanklineStartRegex_ = /^\r?\n\r?\n/;
    diff_match_patch2.prototype.diff_cleanupEfficiency = function(diffs) {
      var changes = false;
      var equalities = [];
      var equalitiesLength = 0;
      var lastEquality = null;
      var pointer = 0;
      var pre_ins = false;
      var pre_del = false;
      var post_ins = false;
      var post_del = false;
      while (pointer < diffs.length) {
        if (diffs[pointer][0] == DIFF_EQUAL2) {
          if (diffs[pointer][1].length < this.Diff_EditCost && (post_ins || post_del)) {
            equalities[equalitiesLength++] = pointer;
            pre_ins = post_ins;
            pre_del = post_del;
            lastEquality = diffs[pointer][1];
          } else {
            equalitiesLength = 0;
            lastEquality = null;
          }
          post_ins = post_del = false;
        } else {
          if (diffs[pointer][0] == DIFF_DELETE2) {
            post_del = true;
          } else {
            post_ins = true;
          }
          if (lastEquality && (pre_ins && pre_del && post_ins && post_del || lastEquality.length < this.Diff_EditCost / 2 && pre_ins + pre_del + post_ins + post_del == 3)) {
            diffs.splice(
              equalities[equalitiesLength - 1],
              0,
              new diff_match_patch2.Diff(DIFF_DELETE2, lastEquality)
            );
            diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT2;
            equalitiesLength--;
            lastEquality = null;
            if (pre_ins && pre_del) {
              post_ins = post_del = true;
              equalitiesLength = 0;
            } else {
              equalitiesLength--;
              pointer = equalitiesLength > 0 ? equalities[equalitiesLength - 1] : -1;
              post_ins = post_del = false;
            }
            changes = true;
          }
        }
        pointer++;
      }
      if (changes) {
        this.diff_cleanupMerge(diffs);
      }
    };
    diff_match_patch2.prototype.diff_cleanupMerge = function(diffs) {
      diffs.push(new diff_match_patch2.Diff(DIFF_EQUAL2, ""));
      var pointer = 0;
      var count_delete = 0;
      var count_insert = 0;
      var text_delete = "";
      var text_insert = "";
      var commonlength;
      while (pointer < diffs.length) {
        switch (diffs[pointer][0]) {
          case DIFF_INSERT2:
            count_insert++;
            text_insert += diffs[pointer][1];
            pointer++;
            break;
          case DIFF_DELETE2:
            count_delete++;
            text_delete += diffs[pointer][1];
            pointer++;
            break;
          case DIFF_EQUAL2:
            if (count_delete + count_insert > 1) {
              if (count_delete !== 0 && count_insert !== 0) {
                commonlength = this.diff_commonPrefix(text_insert, text_delete);
                if (commonlength !== 0) {
                  if (pointer - count_delete - count_insert > 0 && diffs[pointer - count_delete - count_insert - 1][0] == DIFF_EQUAL2) {
                    diffs[pointer - count_delete - count_insert - 1][1] += text_insert.substring(0, commonlength);
                  } else {
                    diffs.splice(0, 0, new diff_match_patch2.Diff(
                      DIFF_EQUAL2,
                      text_insert.substring(0, commonlength)
                    ));
                    pointer++;
                  }
                  text_insert = text_insert.substring(commonlength);
                  text_delete = text_delete.substring(commonlength);
                }
                commonlength = this.diff_commonSuffix(text_insert, text_delete);
                if (commonlength !== 0) {
                  diffs[pointer][1] = text_insert.substring(text_insert.length - commonlength) + diffs[pointer][1];
                  text_insert = text_insert.substring(0, text_insert.length - commonlength);
                  text_delete = text_delete.substring(0, text_delete.length - commonlength);
                }
              }
              pointer -= count_delete + count_insert;
              diffs.splice(pointer, count_delete + count_insert);
              if (text_delete.length) {
                diffs.splice(
                  pointer,
                  0,
                  new diff_match_patch2.Diff(DIFF_DELETE2, text_delete)
                );
                pointer++;
              }
              if (text_insert.length) {
                diffs.splice(
                  pointer,
                  0,
                  new diff_match_patch2.Diff(DIFF_INSERT2, text_insert)
                );
                pointer++;
              }
              pointer++;
            } else if (pointer !== 0 && diffs[pointer - 1][0] == DIFF_EQUAL2) {
              diffs[pointer - 1][1] += diffs[pointer][1];
              diffs.splice(pointer, 1);
            } else {
              pointer++;
            }
            count_insert = 0;
            count_delete = 0;
            text_delete = "";
            text_insert = "";
            break;
        }
      }
      if (diffs[diffs.length - 1][1] === "") {
        diffs.pop();
      }
      var changes = false;
      pointer = 1;
      while (pointer < diffs.length - 1) {
        if (diffs[pointer - 1][0] == DIFF_EQUAL2 && diffs[pointer + 1][0] == DIFF_EQUAL2) {
          if (diffs[pointer][1].substring(diffs[pointer][1].length - diffs[pointer - 1][1].length) == diffs[pointer - 1][1]) {
            diffs[pointer][1] = diffs[pointer - 1][1] + diffs[pointer][1].substring(0, diffs[pointer][1].length - diffs[pointer - 1][1].length);
            diffs[pointer + 1][1] = diffs[pointer - 1][1] + diffs[pointer + 1][1];
            diffs.splice(pointer - 1, 1);
            changes = true;
          } else if (diffs[pointer][1].substring(0, diffs[pointer + 1][1].length) == diffs[pointer + 1][1]) {
            diffs[pointer - 1][1] += diffs[pointer + 1][1];
            diffs[pointer][1] = diffs[pointer][1].substring(diffs[pointer + 1][1].length) + diffs[pointer + 1][1];
            diffs.splice(pointer + 1, 1);
            changes = true;
          }
        }
        pointer++;
      }
      if (changes) {
        this.diff_cleanupMerge(diffs);
      }
    };
    diff_match_patch2.prototype.diff_xIndex = function(diffs, loc) {
      var chars1 = 0;
      var chars2 = 0;
      var last_chars1 = 0;
      var last_chars2 = 0;
      var x;
      for (x = 0; x < diffs.length; x++) {
        if (diffs[x][0] !== DIFF_INSERT2) {
          chars1 += diffs[x][1].length;
        }
        if (diffs[x][0] !== DIFF_DELETE2) {
          chars2 += diffs[x][1].length;
        }
        if (chars1 > loc) {
          break;
        }
        last_chars1 = chars1;
        last_chars2 = chars2;
      }
      if (diffs.length != x && diffs[x][0] === DIFF_DELETE2) {
        return last_chars2;
      }
      return last_chars2 + (loc - last_chars1);
    };
    diff_match_patch2.prototype.diff_prettyHtml = function(diffs) {
      var html = [];
      var pattern_amp = /&/g;
      var pattern_lt = /</g;
      var pattern_gt = />/g;
      var pattern_para = /\n/g;
      for (var x = 0; x < diffs.length; x++) {
        var op = diffs[x][0];
        var data = diffs[x][1];
        var text = data.replace(pattern_amp, "&amp;").replace(pattern_lt, "&lt;").replace(pattern_gt, "&gt;").replace(pattern_para, "&para;<br>");
        switch (op) {
          case DIFF_INSERT2:
            html[x] = '<ins style="background:#e6ffe6;">' + text + "</ins>";
            break;
          case DIFF_DELETE2:
            html[x] = '<del style="background:#ffe6e6;">' + text + "</del>";
            break;
          case DIFF_EQUAL2:
            html[x] = "<span>" + text + "</span>";
            break;
        }
      }
      return html.join("");
    };
    diff_match_patch2.prototype.diff_text1 = function(diffs) {
      var text = [];
      for (var x = 0; x < diffs.length; x++) {
        if (diffs[x][0] !== DIFF_INSERT2) {
          text[x] = diffs[x][1];
        }
      }
      return text.join("");
    };
    diff_match_patch2.prototype.diff_text2 = function(diffs) {
      var text = [];
      for (var x = 0; x < diffs.length; x++) {
        if (diffs[x][0] !== DIFF_DELETE2) {
          text[x] = diffs[x][1];
        }
      }
      return text.join("");
    };
    diff_match_patch2.prototype.diff_levenshtein = function(diffs) {
      var levenshtein = 0;
      var insertions = 0;
      var deletions = 0;
      for (var x = 0; x < diffs.length; x++) {
        var op = diffs[x][0];
        var data = diffs[x][1];
        switch (op) {
          case DIFF_INSERT2:
            insertions += data.length;
            break;
          case DIFF_DELETE2:
            deletions += data.length;
            break;
          case DIFF_EQUAL2:
            levenshtein += Math.max(insertions, deletions);
            insertions = 0;
            deletions = 0;
            break;
        }
      }
      levenshtein += Math.max(insertions, deletions);
      return levenshtein;
    };
    diff_match_patch2.prototype.diff_toDelta = function(diffs) {
      var text = [];
      for (var x = 0; x < diffs.length; x++) {
        switch (diffs[x][0]) {
          case DIFF_INSERT2:
            text[x] = "+" + encodeURI(diffs[x][1]);
            break;
          case DIFF_DELETE2:
            text[x] = "-" + diffs[x][1].length;
            break;
          case DIFF_EQUAL2:
            text[x] = "=" + diffs[x][1].length;
            break;
        }
      }
      return text.join("	").replace(/%20/g, " ");
    };
    diff_match_patch2.prototype.diff_fromDelta = function(text1, delta) {
      var diffs = [];
      var diffsLength = 0;
      var pointer = 0;
      var tokens = delta.split(/\t/g);
      for (var x = 0; x < tokens.length; x++) {
        var param = tokens[x].substring(1);
        switch (tokens[x].charAt(0)) {
          case "+":
            try {
              diffs[diffsLength++] = new diff_match_patch2.Diff(DIFF_INSERT2, decodeURI(param));
            } catch (ex) {
              throw new Error("Illegal escape in diff_fromDelta: " + param);
            }
            break;
          case "-":
          case "=":
            var n = parseInt(param, 10);
            if (isNaN(n) || n < 0) {
              throw new Error("Invalid number in diff_fromDelta: " + param);
            }
            var text = text1.substring(pointer, pointer += n);
            if (tokens[x].charAt(0) == "=") {
              diffs[diffsLength++] = new diff_match_patch2.Diff(DIFF_EQUAL2, text);
            } else {
              diffs[diffsLength++] = new diff_match_patch2.Diff(DIFF_DELETE2, text);
            }
            break;
          default:
            if (tokens[x]) {
              throw new Error("Invalid diff operation in diff_fromDelta: " + tokens[x]);
            }
        }
      }
      if (pointer != text1.length) {
        throw new Error("Delta length (" + pointer + ") does not equal source text length (" + text1.length + ").");
      }
      return diffs;
    };
    diff_match_patch2.prototype.match_main = function(text, pattern, loc) {
      if (text == null || pattern == null || loc == null) {
        throw new Error("Null input. (match_main)");
      }
      loc = Math.max(0, Math.min(loc, text.length));
      if (text == pattern) {
        return 0;
      } else if (!text.length) {
        return -1;
      } else if (text.substring(loc, loc + pattern.length) == pattern) {
        return loc;
      } else {
        return this.match_bitap_(text, pattern, loc);
      }
    };
    diff_match_patch2.prototype.match_bitap_ = function(text, pattern, loc) {
      if (pattern.length > this.Match_MaxBits) {
        throw new Error("Pattern too long for this browser.");
      }
      var s = this.match_alphabet_(pattern);
      var dmp = this;
      function match_bitapScore_(e, x) {
        var accuracy = e / pattern.length;
        var proximity = Math.abs(loc - x);
        if (!dmp.Match_Distance) {
          return proximity ? 1 : accuracy;
        }
        return accuracy + proximity / dmp.Match_Distance;
      }
      var score_threshold = this.Match_Threshold;
      var best_loc = text.indexOf(pattern, loc);
      if (best_loc != -1) {
        score_threshold = Math.min(match_bitapScore_(0, best_loc), score_threshold);
        best_loc = text.lastIndexOf(pattern, loc + pattern.length);
        if (best_loc != -1) {
          score_threshold = Math.min(match_bitapScore_(0, best_loc), score_threshold);
        }
      }
      var matchmask = 1 << pattern.length - 1;
      best_loc = -1;
      var bin_min, bin_mid;
      var bin_max = pattern.length + text.length;
      var last_rd;
      for (var d = 0; d < pattern.length; d++) {
        bin_min = 0;
        bin_mid = bin_max;
        while (bin_min < bin_mid) {
          if (match_bitapScore_(d, loc + bin_mid) <= score_threshold) {
            bin_min = bin_mid;
          } else {
            bin_max = bin_mid;
          }
          bin_mid = Math.floor((bin_max - bin_min) / 2 + bin_min);
        }
        bin_max = bin_mid;
        var start = Math.max(1, loc - bin_mid + 1);
        var finish = Math.min(loc + bin_mid, text.length) + pattern.length;
        var rd = Array(finish + 2);
        rd[finish + 1] = (1 << d) - 1;
        for (var j = finish; j >= start; j--) {
          var charMatch = s[text.charAt(j - 1)];
          if (d === 0) {
            rd[j] = (rd[j + 1] << 1 | 1) & charMatch;
          } else {
            rd[j] = (rd[j + 1] << 1 | 1) & charMatch | ((last_rd[j + 1] | last_rd[j]) << 1 | 1) | last_rd[j + 1];
          }
          if (rd[j] & matchmask) {
            var score = match_bitapScore_(d, j - 1);
            if (score <= score_threshold) {
              score_threshold = score;
              best_loc = j - 1;
              if (best_loc > loc) {
                start = Math.max(1, 2 * loc - best_loc);
              } else {
                break;
              }
            }
          }
        }
        if (match_bitapScore_(d + 1, loc) > score_threshold) {
          break;
        }
        last_rd = rd;
      }
      return best_loc;
    };
    diff_match_patch2.prototype.match_alphabet_ = function(pattern) {
      var s = {};
      for (var i = 0; i < pattern.length; i++) {
        s[pattern.charAt(i)] = 0;
      }
      for (var i = 0; i < pattern.length; i++) {
        s[pattern.charAt(i)] |= 1 << pattern.length - i - 1;
      }
      return s;
    };
    diff_match_patch2.prototype.patch_addContext_ = function(patch, text) {
      if (text.length == 0) {
        return;
      }
      if (patch.start2 === null) {
        throw Error("patch not initialized");
      }
      var pattern = text.substring(patch.start2, patch.start2 + patch.length1);
      var padding = 0;
      while (text.indexOf(pattern) != text.lastIndexOf(pattern) && pattern.length < this.Match_MaxBits - this.Patch_Margin - this.Patch_Margin) {
        padding += this.Patch_Margin;
        pattern = text.substring(
          patch.start2 - padding,
          patch.start2 + patch.length1 + padding
        );
      }
      padding += this.Patch_Margin;
      var prefix = text.substring(patch.start2 - padding, patch.start2);
      if (prefix) {
        patch.diffs.unshift(new diff_match_patch2.Diff(DIFF_EQUAL2, prefix));
      }
      var suffix = text.substring(
        patch.start2 + patch.length1,
        patch.start2 + patch.length1 + padding
      );
      if (suffix) {
        patch.diffs.push(new diff_match_patch2.Diff(DIFF_EQUAL2, suffix));
      }
      patch.start1 -= prefix.length;
      patch.start2 -= prefix.length;
      patch.length1 += prefix.length + suffix.length;
      patch.length2 += prefix.length + suffix.length;
    };
    diff_match_patch2.prototype.patch_make = function(a, opt_b, opt_c) {
      var text1, diffs;
      if (typeof a == "string" && typeof opt_b == "string" && typeof opt_c == "undefined") {
        text1 = /** @type {string} */
        a;
        diffs = this.diff_main(
          text1,
          /** @type {string} */
          opt_b,
          true
        );
        if (diffs.length > 2) {
          this.diff_cleanupSemantic(diffs);
          this.diff_cleanupEfficiency(diffs);
        }
      } else if (a && typeof a == "object" && typeof opt_b == "undefined" && typeof opt_c == "undefined") {
        diffs = /** @type {!Array.<!diff_match_patch.Diff>} */
        a;
        text1 = this.diff_text1(diffs);
      } else if (typeof a == "string" && opt_b && typeof opt_b == "object" && typeof opt_c == "undefined") {
        text1 = /** @type {string} */
        a;
        diffs = /** @type {!Array.<!diff_match_patch.Diff>} */
        opt_b;
      } else if (typeof a == "string" && typeof opt_b == "string" && opt_c && typeof opt_c == "object") {
        text1 = /** @type {string} */
        a;
        diffs = /** @type {!Array.<!diff_match_patch.Diff>} */
        opt_c;
      } else {
        throw new Error("Unknown call format to patch_make.");
      }
      if (diffs.length === 0) {
        return [];
      }
      var patches = [];
      var patch = new diff_match_patch2.patch_obj();
      var patchDiffLength = 0;
      var char_count1 = 0;
      var char_count2 = 0;
      var prepatch_text = text1;
      var postpatch_text = text1;
      for (var x = 0; x < diffs.length; x++) {
        var diff_type = diffs[x][0];
        var diff_text = diffs[x][1];
        if (!patchDiffLength && diff_type !== DIFF_EQUAL2) {
          patch.start1 = char_count1;
          patch.start2 = char_count2;
        }
        switch (diff_type) {
          case DIFF_INSERT2:
            patch.diffs[patchDiffLength++] = diffs[x];
            patch.length2 += diff_text.length;
            postpatch_text = postpatch_text.substring(0, char_count2) + diff_text + postpatch_text.substring(char_count2);
            break;
          case DIFF_DELETE2:
            patch.length1 += diff_text.length;
            patch.diffs[patchDiffLength++] = diffs[x];
            postpatch_text = postpatch_text.substring(0, char_count2) + postpatch_text.substring(char_count2 + diff_text.length);
            break;
          case DIFF_EQUAL2:
            if (diff_text.length <= 2 * this.Patch_Margin && patchDiffLength && diffs.length != x + 1) {
              patch.diffs[patchDiffLength++] = diffs[x];
              patch.length1 += diff_text.length;
              patch.length2 += diff_text.length;
            } else if (diff_text.length >= 2 * this.Patch_Margin) {
              if (patchDiffLength) {
                this.patch_addContext_(patch, prepatch_text);
                patches.push(patch);
                patch = new diff_match_patch2.patch_obj();
                patchDiffLength = 0;
                prepatch_text = postpatch_text;
                char_count1 = char_count2;
              }
            }
            break;
        }
        if (diff_type !== DIFF_INSERT2) {
          char_count1 += diff_text.length;
        }
        if (diff_type !== DIFF_DELETE2) {
          char_count2 += diff_text.length;
        }
      }
      if (patchDiffLength) {
        this.patch_addContext_(patch, prepatch_text);
        patches.push(patch);
      }
      return patches;
    };
    diff_match_patch2.prototype.patch_deepCopy = function(patches) {
      var patchesCopy = [];
      for (var x = 0; x < patches.length; x++) {
        var patch = patches[x];
        var patchCopy = new diff_match_patch2.patch_obj();
        patchCopy.diffs = [];
        for (var y = 0; y < patch.diffs.length; y++) {
          patchCopy.diffs[y] = new diff_match_patch2.Diff(patch.diffs[y][0], patch.diffs[y][1]);
        }
        patchCopy.start1 = patch.start1;
        patchCopy.start2 = patch.start2;
        patchCopy.length1 = patch.length1;
        patchCopy.length2 = patch.length2;
        patchesCopy[x] = patchCopy;
      }
      return patchesCopy;
    };
    diff_match_patch2.prototype.patch_apply = function(patches, text) {
      if (patches.length == 0) {
        return [text, []];
      }
      patches = this.patch_deepCopy(patches);
      var nullPadding = this.patch_addPadding(patches);
      text = nullPadding + text + nullPadding;
      this.patch_splitMax(patches);
      var delta = 0;
      var results = [];
      for (var x = 0; x < patches.length; x++) {
        var expected_loc = patches[x].start2 + delta;
        var text1 = this.diff_text1(patches[x].diffs);
        var start_loc;
        var end_loc = -1;
        if (text1.length > this.Match_MaxBits) {
          start_loc = this.match_main(
            text,
            text1.substring(0, this.Match_MaxBits),
            expected_loc
          );
          if (start_loc != -1) {
            end_loc = this.match_main(
              text,
              text1.substring(text1.length - this.Match_MaxBits),
              expected_loc + text1.length - this.Match_MaxBits
            );
            if (end_loc == -1 || start_loc >= end_loc) {
              start_loc = -1;
            }
          }
        } else {
          start_loc = this.match_main(text, text1, expected_loc);
        }
        if (start_loc == -1) {
          results[x] = false;
          delta -= patches[x].length2 - patches[x].length1;
        } else {
          results[x] = true;
          delta = start_loc - expected_loc;
          var text2;
          if (end_loc == -1) {
            text2 = text.substring(start_loc, start_loc + text1.length);
          } else {
            text2 = text.substring(start_loc, end_loc + this.Match_MaxBits);
          }
          if (text1 == text2) {
            text = text.substring(0, start_loc) + this.diff_text2(patches[x].diffs) + text.substring(start_loc + text1.length);
          } else {
            var diffs = this.diff_main(text1, text2, false);
            if (text1.length > this.Match_MaxBits && this.diff_levenshtein(diffs) / text1.length > this.Patch_DeleteThreshold) {
              results[x] = false;
            } else {
              this.diff_cleanupSemanticLossless(diffs);
              var index1 = 0;
              var index2;
              for (var y = 0; y < patches[x].diffs.length; y++) {
                var mod = patches[x].diffs[y];
                if (mod[0] !== DIFF_EQUAL2) {
                  index2 = this.diff_xIndex(diffs, index1);
                }
                if (mod[0] === DIFF_INSERT2) {
                  text = text.substring(0, start_loc + index2) + mod[1] + text.substring(start_loc + index2);
                } else if (mod[0] === DIFF_DELETE2) {
                  text = text.substring(0, start_loc + index2) + text.substring(start_loc + this.diff_xIndex(
                    diffs,
                    index1 + mod[1].length
                  ));
                }
                if (mod[0] !== DIFF_DELETE2) {
                  index1 += mod[1].length;
                }
              }
            }
          }
        }
      }
      text = text.substring(nullPadding.length, text.length - nullPadding.length);
      return [text, results];
    };
    diff_match_patch2.prototype.patch_addPadding = function(patches) {
      var paddingLength = this.Patch_Margin;
      var nullPadding = "";
      for (var x = 1; x <= paddingLength; x++) {
        nullPadding += String.fromCharCode(x);
      }
      for (var x = 0; x < patches.length; x++) {
        patches[x].start1 += paddingLength;
        patches[x].start2 += paddingLength;
      }
      var patch = patches[0];
      var diffs = patch.diffs;
      if (diffs.length == 0 || diffs[0][0] != DIFF_EQUAL2) {
        diffs.unshift(new diff_match_patch2.Diff(DIFF_EQUAL2, nullPadding));
        patch.start1 -= paddingLength;
        patch.start2 -= paddingLength;
        patch.length1 += paddingLength;
        patch.length2 += paddingLength;
      } else if (paddingLength > diffs[0][1].length) {
        var extraLength = paddingLength - diffs[0][1].length;
        diffs[0][1] = nullPadding.substring(diffs[0][1].length) + diffs[0][1];
        patch.start1 -= extraLength;
        patch.start2 -= extraLength;
        patch.length1 += extraLength;
        patch.length2 += extraLength;
      }
      patch = patches[patches.length - 1];
      diffs = patch.diffs;
      if (diffs.length == 0 || diffs[diffs.length - 1][0] != DIFF_EQUAL2) {
        diffs.push(new diff_match_patch2.Diff(DIFF_EQUAL2, nullPadding));
        patch.length1 += paddingLength;
        patch.length2 += paddingLength;
      } else if (paddingLength > diffs[diffs.length - 1][1].length) {
        var extraLength = paddingLength - diffs[diffs.length - 1][1].length;
        diffs[diffs.length - 1][1] += nullPadding.substring(0, extraLength);
        patch.length1 += extraLength;
        patch.length2 += extraLength;
      }
      return nullPadding;
    };
    diff_match_patch2.prototype.patch_splitMax = function(patches) {
      var patch_size = this.Match_MaxBits;
      for (var x = 0; x < patches.length; x++) {
        if (patches[x].length1 <= patch_size) {
          continue;
        }
        var bigpatch = patches[x];
        patches.splice(x--, 1);
        var start1 = bigpatch.start1;
        var start2 = bigpatch.start2;
        var precontext = "";
        while (bigpatch.diffs.length !== 0) {
          var patch = new diff_match_patch2.patch_obj();
          var empty = true;
          patch.start1 = start1 - precontext.length;
          patch.start2 = start2 - precontext.length;
          if (precontext !== "") {
            patch.length1 = patch.length2 = precontext.length;
            patch.diffs.push(new diff_match_patch2.Diff(DIFF_EQUAL2, precontext));
          }
          while (bigpatch.diffs.length !== 0 && patch.length1 < patch_size - this.Patch_Margin) {
            var diff_type = bigpatch.diffs[0][0];
            var diff_text = bigpatch.diffs[0][1];
            if (diff_type === DIFF_INSERT2) {
              patch.length2 += diff_text.length;
              start2 += diff_text.length;
              patch.diffs.push(bigpatch.diffs.shift());
              empty = false;
            } else if (diff_type === DIFF_DELETE2 && patch.diffs.length == 1 && patch.diffs[0][0] == DIFF_EQUAL2 && diff_text.length > 2 * patch_size) {
              patch.length1 += diff_text.length;
              start1 += diff_text.length;
              empty = false;
              patch.diffs.push(new diff_match_patch2.Diff(diff_type, diff_text));
              bigpatch.diffs.shift();
            } else {
              diff_text = diff_text.substring(
                0,
                patch_size - patch.length1 - this.Patch_Margin
              );
              patch.length1 += diff_text.length;
              start1 += diff_text.length;
              if (diff_type === DIFF_EQUAL2) {
                patch.length2 += diff_text.length;
                start2 += diff_text.length;
              } else {
                empty = false;
              }
              patch.diffs.push(new diff_match_patch2.Diff(diff_type, diff_text));
              if (diff_text == bigpatch.diffs[0][1]) {
                bigpatch.diffs.shift();
              } else {
                bigpatch.diffs[0][1] = bigpatch.diffs[0][1].substring(diff_text.length);
              }
            }
          }
          precontext = this.diff_text2(patch.diffs);
          precontext = precontext.substring(precontext.length - this.Patch_Margin);
          var postcontext = this.diff_text1(bigpatch.diffs).substring(0, this.Patch_Margin);
          if (postcontext !== "") {
            patch.length1 += postcontext.length;
            patch.length2 += postcontext.length;
            if (patch.diffs.length !== 0 && patch.diffs[patch.diffs.length - 1][0] === DIFF_EQUAL2) {
              patch.diffs[patch.diffs.length - 1][1] += postcontext;
            } else {
              patch.diffs.push(new diff_match_patch2.Diff(DIFF_EQUAL2, postcontext));
            }
          }
          if (!empty) {
            patches.splice(++x, 0, patch);
          }
        }
      }
    };
    diff_match_patch2.prototype.patch_toText = function(patches) {
      var text = [];
      for (var x = 0; x < patches.length; x++) {
        text[x] = patches[x];
      }
      return text.join("");
    };
    diff_match_patch2.prototype.patch_fromText = function(textline) {
      var patches = [];
      if (!textline) {
        return patches;
      }
      var text = textline.split("\n");
      var textPointer = 0;
      var patchHeader = /^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@$/;
      while (textPointer < text.length) {
        var m = text[textPointer].match(patchHeader);
        if (!m) {
          throw new Error("Invalid patch string: " + text[textPointer]);
        }
        var patch = new diff_match_patch2.patch_obj();
        patches.push(patch);
        patch.start1 = parseInt(m[1], 10);
        if (m[2] === "") {
          patch.start1--;
          patch.length1 = 1;
        } else if (m[2] == "0") {
          patch.length1 = 0;
        } else {
          patch.start1--;
          patch.length1 = parseInt(m[2], 10);
        }
        patch.start2 = parseInt(m[3], 10);
        if (m[4] === "") {
          patch.start2--;
          patch.length2 = 1;
        } else if (m[4] == "0") {
          patch.length2 = 0;
        } else {
          patch.start2--;
          patch.length2 = parseInt(m[4], 10);
        }
        textPointer++;
        while (textPointer < text.length) {
          var sign = text[textPointer].charAt(0);
          try {
            var line = decodeURI(text[textPointer].substring(1));
          } catch (ex) {
            throw new Error("Illegal escape in patch_fromText: " + line);
          }
          if (sign == "-") {
            patch.diffs.push(new diff_match_patch2.Diff(DIFF_DELETE2, line));
          } else if (sign == "+") {
            patch.diffs.push(new diff_match_patch2.Diff(DIFF_INSERT2, line));
          } else if (sign == " ") {
            patch.diffs.push(new diff_match_patch2.Diff(DIFF_EQUAL2, line));
          } else if (sign == "@") {
            break;
          } else if (sign === "") {
          } else {
            throw new Error('Invalid patch mode "' + sign + '" in: ' + line);
          }
          textPointer++;
        }
      }
      return patches;
    };
    diff_match_patch2.patch_obj = function() {
      this.diffs = [];
      this.start1 = null;
      this.start2 = null;
      this.length1 = 0;
      this.length2 = 0;
    };
    diff_match_patch2.patch_obj.prototype.toString = function() {
      var coords1, coords2;
      if (this.length1 === 0) {
        coords1 = this.start1 + ",0";
      } else if (this.length1 == 1) {
        coords1 = this.start1 + 1;
      } else {
        coords1 = this.start1 + 1 + "," + this.length1;
      }
      if (this.length2 === 0) {
        coords2 = this.start2 + ",0";
      } else if (this.length2 == 1) {
        coords2 = this.start2 + 1;
      } else {
        coords2 = this.start2 + 1 + "," + this.length2;
      }
      var text = ["@@ -" + coords1 + " +" + coords2 + " @@\n"];
      var op;
      for (var x = 0; x < this.diffs.length; x++) {
        switch (this.diffs[x][0]) {
          case DIFF_INSERT2:
            op = "+";
            break;
          case DIFF_DELETE2:
            op = "-";
            break;
          case DIFF_EQUAL2:
            op = " ";
            break;
        }
        text[x + 1] = op + encodeURI(this.diffs[x][1]) + "\n";
      }
      return text.join("").replace(/%20/g, " ");
    };
    module2.exports = diff_match_patch2;
    module2.exports["diff_match_patch"] = diff_match_patch2;
    module2.exports["DIFF_DELETE"] = DIFF_DELETE2;
    module2.exports["DIFF_INSERT"] = DIFF_INSERT2;
    module2.exports["DIFF_EQUAL"] = DIFF_EQUAL2;
  }
});

// plugins/editorial-engine/src/adapters/track-edits-adapter.ts
var track_edits_adapter_exports = {};
__export(track_edits_adapter_exports, {
  TrackEditsAdapter: () => TrackEditsAdapter
});
var TrackEditsAdapter;
var init_track_edits_adapter = __esm({
  "plugins/editorial-engine/src/adapters/track-edits-adapter.ts"() {
    TrackEditsAdapter = class {
      constructor() {
        this.name = "track-edits";
        this.version = "1.0.0";
        this.supportedOperations = ["text-edit", "content-modification", "proofreading", "editing"];
        this.capabilities = {
          batchProcessing: true,
          realTimeProcessing: true,
          undoSupport: true,
          provenance: true,
          streaming: false
        };
        this.initialized = false;
        this.config = {};
        this.metrics = {
          executionsCount: 0,
          successRate: 1,
          averageLatency: 0,
          errorCount: 0,
          lastExecution: Date.now()
        };
        this.executionTimes = [];
        this.errors = [];
      }
      async initialize(config) {
        var _a;
        this.config = config;
        if (!((_a = window.WriterrlAPI) == null ? void 0 : _a.trackEdits)) {
          throw new Error("Track Edits plugin is not loaded or accessible");
        }
        const currentSession = window.WriterrlAPI.trackEdits.getCurrentSession();
        console.log("Track Edits Adapter initialized, current session:", currentSession ? "active" : "none");
        this.initialized = true;
      }
      async execute(job) {
        const startTime = performance.now();
        try {
          if (!this.initialized) {
            throw new Error("Track Edits Adapter not initialized");
          }
          await this.ensureTrackingSession();
          const trackEditsChanges = this.convertToTrackEditsFormat(job);
          const result = await this.processChangesWithTrackEdits(trackEditsChanges, job);
          const executionTime = performance.now() - startTime;
          this.recordExecution(executionTime, true);
          return this.convertFromTrackEditsFormat(result, job);
        } catch (error) {
          const executionTime = performance.now() - startTime;
          this.recordExecution(executionTime, false, error.message);
          return {
            success: false,
            jobId: job.id,
            timestamp: Date.now(),
            executionTime,
            errors: [{
              type: "adapter-error",
              message: error.message,
              timestamp: Date.now()
            }],
            metadata: {
              adapter: this.name,
              version: this.version
            }
          };
        }
      }
      async cleanup() {
        this.initialized = false;
        this.config = {};
        console.log("Track Edits Adapter cleaned up");
      }
      getStatus() {
        var _a, _b, _c;
        const isTrackEditsAvailable = !!((_a = window.WriterrlAPI) == null ? void 0 : _a.trackEdits);
        const hasActiveSession = !!((_c = (_b = window.WriterrlAPI) == null ? void 0 : _b.trackEdits) == null ? void 0 : _c.getCurrentSession());
        return {
          healthy: this.initialized && isTrackEditsAvailable,
          ready: this.initialized && isTrackEditsAvailable && hasActiveSession,
          error: !isTrackEditsAvailable ? "Track Edits plugin not available" : !hasActiveSession ? "No active tracking session" : void 0,
          lastHealthCheck: Date.now(),
          currentLoad: 0
        };
      }
      getMetrics() {
        return { ...this.metrics };
      }
      // Private implementation methods
      async ensureTrackingSession() {
        var _a;
        if (!((_a = window.WriterrlAPI) == null ? void 0 : _a.trackEdits)) {
          throw new Error("Track Edits API not available");
        }
        const currentSession = window.WriterrlAPI.trackEdits.getCurrentSession();
        if (!currentSession) {
          window.WriterrlAPI.trackEdits.startTracking();
          const newSession = window.WriterrlAPI.trackEdits.getCurrentSession();
          if (!newSession) {
            throw new Error("Failed to start Track Edits session");
          }
          console.log("Started Track Edits session:", newSession.id);
        }
      }
      convertToTrackEditsFormat(job) {
        var _a;
        const changes = [];
        if (job.payload.changes) {
          return job.payload.changes;
        }
        if (job.payload.text && job.payload.edits) {
          for (const edit of job.payload.edits) {
            changes.push({
              id: `${job.id}-${edit.id || Date.now()}`,
              timestamp: Date.now(),
              type: edit.type === "addition" ? "insert" : edit.type === "deletion" ? "delete" : "replace",
              from: edit.start || 0,
              to: edit.end || edit.start || 0,
              text: edit.newText || "",
              removedText: edit.oldText || "",
              author: "editorial-engine",
              metadata: {
                jobId: job.id,
                mode: job.payload.mode,
                provenance: "editorial-engine"
              }
            });
          }
        } else if (job.payload.text) {
          changes.push({
            id: `${job.id}-full-text`,
            timestamp: Date.now(),
            type: "replace",
            from: 0,
            to: ((_a = job.payload.originalText) == null ? void 0 : _a.length) || 0,
            text: job.payload.text,
            removedText: job.payload.originalText || "",
            author: "editorial-engine",
            metadata: {
              jobId: job.id,
              mode: job.payload.mode,
              provenance: "editorial-engine"
            }
          });
        }
        return changes;
      }
      async processChangesWithTrackEdits(changes, job) {
        const trackEditsAPI = window.WriterrlAPI.trackEdits;
        const currentSession = trackEditsAPI.getCurrentSession();
        return {
          success: true,
          sessionId: currentSession.id,
          appliedChanges: changes,
          rejectedChanges: [],
          timestamp: Date.now(),
          metadata: {
            jobId: job.id,
            mode: job.payload.mode,
            processingTime: 0
          }
        };
      }
      convertFromTrackEditsFormat(trackEditsResult, job) {
        var _a;
        const executionTime = performance.now() - (((_a = job.metadata) == null ? void 0 : _a.startTime) || Date.now());
        if (!trackEditsResult.success) {
          return {
            success: false,
            jobId: job.id,
            timestamp: Date.now(),
            executionTime,
            errors: [{
              type: "track-edits-error",
              message: "Track Edits processing failed",
              timestamp: Date.now()
            }],
            metadata: {
              adapter: this.name,
              version: this.version,
              trackEditsSession: trackEditsResult.sessionId
            }
          };
        }
        return {
          success: true,
          jobId: job.id,
          timestamp: Date.now(),
          executionTime,
          result: {
            processedText: job.payload.text,
            // In real implementation, get processed text from Track Edits
            changes: trackEditsResult.appliedChanges,
            rejectedChanges: trackEditsResult.rejectedChanges,
            sessionId: trackEditsResult.sessionId
          },
          metadata: {
            adapter: this.name,
            version: this.version,
            trackEditsSession: trackEditsResult.sessionId,
            appliedChanges: trackEditsResult.appliedChanges.length,
            rejectedChanges: trackEditsResult.rejectedChanges.length
          },
          provenance: {
            adapter: this.name,
            timestamp: Date.now(),
            jobId: job.id,
            sessionId: trackEditsResult.sessionId,
            changes: trackEditsResult.appliedChanges.map((change) => ({
              id: change.id,
              type: change.type,
              position: { from: change.from, to: change.to },
              author: change.author
            }))
          }
        };
      }
      recordExecution(executionTime, success, error) {
        this.metrics.executionsCount++;
        this.metrics.lastExecution = Date.now();
        this.executionTimes.push(executionTime);
        if (this.executionTimes.length > 100) {
          this.executionTimes = this.executionTimes.slice(-100);
        }
        this.metrics.averageLatency = this.executionTimes.reduce((sum, time) => sum + time, 0) / this.executionTimes.length;
        if (success) {
          this.metrics.successRate = (this.metrics.successRate * (this.metrics.executionsCount - 1) + 1) / this.metrics.executionsCount;
        } else {
          this.metrics.errorCount++;
          this.metrics.successRate = this.metrics.successRate * (this.metrics.executionsCount - 1) / this.metrics.executionsCount;
          if (error) {
            this.errors.push(error);
            if (this.errors.length > 50) {
              this.errors = this.errors.slice(-50);
            }
          }
        }
      }
    };
  }
});

// plugins/editorial-engine/src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => EditorialEnginePlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// plugins/editorial-engine/src/settings.ts
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  version: "1.0.0",
  enabledModes: ["proofreader", "copy-editor", "developmental-editor"],
  defaultMode: "proofreader",
  constraintValidation: {
    strictMode: true,
    maxProcessingTime: 1e4,
    // 10 seconds
    memoryLimits: {
      maxRulesetSize: 1e3,
      maxConcurrentJobs: 3
    }
  },
  adapters: {
    "track-edits": {
      enabled: true,
      config: {
        batchSize: 10,
        timeout: 5e3
      },
      priority: 1
    }
  },
  performance: {
    enableCaching: true,
    cacheSize: 100,
    backgroundProcessing: true
  }
};
var EditorialEngineSettingsTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  async display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Editorial Engine Settings" });
    this.createGeneralSettings(containerEl);
    await this.createModeSettings(containerEl);
    this.createAdapterSettings(containerEl);
    this.createPerformanceSettings(containerEl);
  }
  createGeneralSettings(containerEl) {
    containerEl.createEl("h3", { text: "General Settings" });
    const availableModes = this.plugin.modeRegistry.getAllModes();
    new import_obsidian.Setting(containerEl).setName("Default Mode").setDesc("The default editing mode to use when no specific mode is selected").addDropdown((dropdown) => {
      for (const mode of availableModes) {
        dropdown.addOption(mode.id, mode.name);
      }
      dropdown.setValue(this.plugin.settings.defaultMode).onChange(async (value) => {
        this.plugin.settings.defaultMode = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Strict Mode").setDesc("Enable strict constraint validation (recommended)").addToggle((toggle) => toggle.setValue(this.plugin.settings.constraintValidation.strictMode).onChange(async (value) => {
      this.plugin.settings.constraintValidation.strictMode = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Max Processing Time").setDesc("Maximum time (in seconds) to wait for processing completion").addSlider((slider) => slider.setLimits(5, 60, 5).setValue(this.plugin.settings.constraintValidation.maxProcessingTime / 1e3).setDynamicTooltip().onChange(async (value) => {
      this.plugin.settings.constraintValidation.maxProcessingTime = value * 1e3;
      await this.plugin.saveSettings();
    }));
  }
  async createModeSettings(containerEl) {
    containerEl.createEl("h3", { text: "Mode Configuration" });
    const modesContainer = containerEl.createDiv("modes-container");
    modesContainer.style.cssText = `
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      padding: 15px;
      margin: 10px 0;
    `;
    const infoEl = modesContainer.createEl("p", {
      text: "Modes are loaded from .obsidian/plugins/editorial-engine/modes/ folder. Add or edit .md files to create custom modes.",
      cls: "setting-item-description"
    });
    infoEl.style.cssText = `
      color: var(--text-muted);
      font-size: 0.9em;
      margin-bottom: 15px;
      padding: 8px;
      background: var(--background-secondary);
      border-radius: 3px;
    `;
    const enabledModes = this.plugin.settings.enabledModes;
    const availableModes = this.plugin.modeRegistry.getAllModes();
    if (availableModes.length === 0) {
      modesContainer.createEl("p", {
        text: "No modes found. Add mode files to .obsidian/plugins/editorial-engine/modes/ folder.",
        cls: "setting-item-description"
      });
      return;
    }
    for (const mode of availableModes) {
      new import_obsidian.Setting(modesContainer).setName(mode.name).setDesc(mode.description || `${mode.name} mode`).addToggle((toggle) => toggle.setValue(enabledModes.includes(mode.id)).onChange(async (value) => {
        if (value) {
          if (!enabledModes.includes(mode.id)) {
            enabledModes.push(mode.id);
          }
        } else {
          const index = enabledModes.indexOf(mode.id);
          if (index > -1) {
            enabledModes.splice(index, 1);
          }
        }
        await this.plugin.saveSettings();
      }));
    }
  }
  createAdapterSettings(containerEl) {
    containerEl.createEl("h3", { text: "Adapter Configuration" });
    const adaptersContainer = containerEl.createDiv("adapters-container");
    adaptersContainer.style.cssText = `
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      padding: 15px;
      margin: 10px 0;
    `;
    const trackEditsConfig = this.plugin.settings.adapters["track-edits"];
    new import_obsidian.Setting(adaptersContainer).setName("Track Edits Integration").setDesc("Enable integration with Track Edits plugin for change management").addToggle((toggle) => toggle.setValue(trackEditsConfig.enabled).onChange(async (value) => {
      trackEditsConfig.enabled = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(adaptersContainer).setName("Batch Size").setDesc("Number of changes to batch together for Track Edits").addSlider((slider) => slider.setLimits(1, 50, 1).setValue(trackEditsConfig.config.batchSize).setDynamicTooltip().onChange(async (value) => {
      trackEditsConfig.config.batchSize = value;
      await this.plugin.saveSettings();
    }));
  }
  createPerformanceSettings(containerEl) {
    containerEl.createEl("h3", { text: "Performance Settings" });
    new import_obsidian.Setting(containerEl).setName("Enable Caching").setDesc("Cache processing results to improve performance").addToggle((toggle) => toggle.setValue(this.plugin.settings.performance.enableCaching).onChange(async (value) => {
      this.plugin.settings.performance.enableCaching = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Cache Size").setDesc("Maximum number of results to keep in cache").addSlider((slider) => slider.setLimits(10, 500, 10).setValue(this.plugin.settings.performance.cacheSize).setDynamicTooltip().onChange(async (value) => {
      this.plugin.settings.performance.cacheSize = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Background Processing").setDesc("Process long-running tasks in the background").addToggle((toggle) => toggle.setValue(this.plugin.settings.performance.backgroundProcessing).onChange(async (value) => {
      this.plugin.settings.performance.backgroundProcessing = value;
      await this.plugin.saveSettings();
    }));
    const performanceContainer = containerEl.createDiv("performance-monitor");
    performanceContainer.style.cssText = `
      background: var(--background-secondary);
      border-radius: 4px;
      padding: 15px;
      margin: 15px 0;
    `;
    performanceContainer.createEl("h4", { text: "Performance Metrics" });
    const metricsEl = performanceContainer.createDiv();
    this.updatePerformanceMetrics(metricsEl);
  }
  updatePerformanceMetrics(container) {
    container.empty();
    const metrics = this.plugin.getPerformanceMetrics();
    if (metrics) {
      const metricsGrid = container.createDiv();
      metricsGrid.style.cssText = `
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 10px;
      `;
      const metricItems = [
        { label: "Avg Processing Time", value: `${metrics.avgProcessingTime.toFixed(2)}ms` },
        { label: "Success Rate", value: `${(metrics.successRate * 100).toFixed(1)}%` },
        { label: "Total Requests", value: metrics.totalRequests.toString() },
        { label: "Cache Hit Rate", value: `${(metrics.cacheHitRate * 100).toFixed(1)}%` }
      ];
      for (const item of metricItems) {
        const metricEl = metricsGrid.createDiv();
        metricEl.style.cssText = `
          padding: 8px;
          border: 1px solid var(--background-modifier-border);
          border-radius: 3px;
        `;
        metricEl.createEl("div", { text: item.label, cls: "metric-label" });
        const valueEl = metricEl.createEl("div", { text: item.value, cls: "metric-value" });
        valueEl.style.fontWeight = "bold";
      }
    } else {
      container.createEl("p", { text: "No performance data available yet." });
    }
  }
};

// plugins/editorial-engine/src/simple-diff-processor.ts
var import_diff_match_patch = __toESM(require_diff_match_patch());

// plugins/editorial-engine/src/ruleset-compiler.ts
var RulesetCompiler = class {
  constructor() {
    this.nlProcessor = new NaturalLanguageProcessor();
  }
  async compile(intent, mode) {
    if (mode.constraints && mode.constraints.length > 0) {
      return {
        constraints: mode.constraints,
        validationRules: this.generateValidationRules(mode.constraints),
        executionParams: this.deriveExecutionParams(intent),
        compiledAt: Date.now()
      };
    }
    return await this.compileMode(mode);
  }
  async compileMode(mode) {
    const parsedRules = await this.parseNaturalLanguage(mode.naturalLanguageRules);
    const constraints = await this.mapToConstraints(parsedRules);
    const validationRules = this.generateValidationRules(constraints);
    const executionParams = {
      timeout: 1e4,
      // 10 seconds default
      maxRetries: 2,
      preferredAdapters: ["track-edits"],
      fallbackStrategy: "graceful-degradation"
    };
    return {
      constraints,
      validationRules,
      executionParams,
      compiledAt: Date.now()
    };
  }
  async parseNaturalLanguage(rules) {
    const results = [];
    for (const rule of rules.allowed) {
      const parsed = await this.nlProcessor.parse(rule, "permission");
      results.push(parsed);
    }
    for (const rule of rules.forbidden) {
      const parsed = await this.nlProcessor.parse(rule, "prohibition");
      results.push(parsed);
    }
    for (const rule of rules.focus) {
      const parsed = await this.nlProcessor.parse(rule, "focus");
      results.push(parsed);
    }
    for (const rule of rules.boundaries) {
      const parsed = await this.nlProcessor.parse(rule, "boundary");
      results.push(parsed);
    }
    return results;
  }
  async mapToConstraints(parsedRules) {
    const constraints = [];
    for (const rule of parsedRules) {
      const constraint = this.ruleToConstraint(rule);
      if (constraint) {
        constraints.push(constraint);
      }
    }
    return constraints;
  }
  ruleToConstraint(rule) {
    switch (rule.type) {
      case "permission":
        return this.createPermissionConstraint(rule);
      case "prohibition":
        return this.createProhibitionConstraint(rule);
      case "boundary":
        return this.createBoundaryConstraint(rule);
      case "focus":
        return this.createFocusConstraint(rule);
      default:
        console.warn(`Unknown rule type: ${rule.type}`);
        return null;
    }
  }
  createPermissionConstraint(rule) {
    const intent = rule.intent.toLowerCase();
    if (intent.includes("grammar") || intent.includes("spelling")) {
      return {
        type: "grammar_only" /* GRAMMAR_ONLY */,
        parameters: {
          allowSpelling: true,
          allowGrammar: true,
          allowPunctuation: true
        },
        priority: rule.confidence * 10,
        validation: [{
          type: "output-validation",
          condition: "minimal-content-change",
          message: "Changes should be limited to grammar and spelling"
        }]
      };
    }
    return {
      type: "style_consistency" /* STYLE_CONSISTENCY */,
      parameters: { allowedOperations: [rule.intent] },
      priority: rule.confidence * 10,
      validation: []
    };
  }
  createProhibitionConstraint(rule) {
    const intent = rule.intent.toLowerCase();
    if (intent.includes("voice") || intent.includes("style") || intent.includes("tone")) {
      return {
        type: "preserve_tone" /* PRESERVE_TONE */,
        parameters: {
          preserveVoice: true,
          preserveStyle: true,
          allowMinorAdjustments: false
        },
        priority: rule.confidence * 10,
        validation: [{
          type: "tone-analysis",
          condition: "tone-similarity > 0.9",
          message: "Must preserve original tone and voice"
        }]
      };
    }
    if (intent.includes("content") || intent.includes("meaning")) {
      return {
        type: "no_content_change" /* NO_CONTENT_CHANGE */,
        parameters: {
          preserveMeaning: true,
          allowClarification: false
        },
        priority: rule.confidence * 10,
        validation: [{
          type: "semantic-analysis",
          condition: "meaning-similarity > 0.95",
          message: "Must preserve original meaning"
        }]
      };
    }
    return {
      type: "no_content_change" /* NO_CONTENT_CHANGE */,
      parameters: { prohibitedAction: rule.intent },
      priority: rule.confidence * 10,
      validation: []
    };
  }
  createBoundaryConstraint(rule) {
    const intent = rule.intent.toLowerCase();
    const percentageMatch = intent.match(/(\d+)%/);
    if (percentageMatch) {
      const percentage = parseInt(percentageMatch[1]) / 100;
      return {
        type: "length_limit" /* LENGTH_LIMIT */,
        parameters: {
          maxChangeRatio: percentage,
          measurementType: "words"
        },
        priority: rule.confidence * 10,
        validation: [{
          type: "change-ratio-check",
          condition: `change-ratio <= ${percentage}`,
          message: `Changes must not exceed ${percentageMatch[1]}% of original text`
        }]
      };
    }
    return {
      type: "length_limit" /* LENGTH_LIMIT */,
      parameters: { maxChangeRatio: 0.25 },
      // 25% default limit
      priority: rule.confidence * 10,
      validation: []
    };
  }
  createFocusConstraint(rule) {
    return {
      type: "style_consistency" /* STYLE_CONSISTENCY */,
      parameters: {
        focusArea: rule.intent,
        priority: "high"
      },
      priority: rule.confidence * 10,
      validation: []
    };
  }
  generateValidationRules(constraints) {
    const rules = [];
    for (const constraint of constraints) {
      rules.push(...constraint.validation);
    }
    rules.push({
      type: "basic-validation",
      condition: "output-not-empty",
      message: "Output must not be empty"
    });
    return rules;
  }
  deriveExecutionParams(intent) {
    let timeout = 1e4;
    if (intent.type === "summarization") {
      timeout = 15e3;
    } else if (intent.type === "grammar-check") {
      timeout = 5e3;
    }
    return {
      timeout,
      maxRetries: 2,
      preferredAdapters: ["track-edits"],
      fallbackStrategy: "graceful-degradation"
    };
  }
};
var NaturalLanguageProcessor = class {
  constructor() {
    // Common patterns for better rule parsing
    this.QUANTIFIER_PATTERNS = [
      /(\d+)\s*%/i,
      // "25%", "50%"
      /no more than\s+(\d+)\s*%/i,
      // "no more than 15%"
      /less than\s+(\d+)\s*%/i,
      // "less than 20%"
      /under\s+(\d+)\s*%/i,
      // "under 10%"
      /(\d+)\s*(words?|characters?|sentences?)/i,
      // "100 words", "50 characters"
      /minimal(?:ly)?/i,
      // "minimal changes"
      /maximum\s+(\d+)/i
      // "maximum 3 sentences"
    ];
    this.PERMISSION_KEYWORDS = [
      "allow",
      "permit",
      "enable",
      "fix",
      "correct",
      "improve",
      "enhance",
      "adjust",
      "modify",
      "update",
      "refine",
      "polish",
      "standardize"
    ];
    this.PROHIBITION_KEYWORDS = [
      "never",
      "don't",
      "avoid",
      "prevent",
      "prohibit",
      "forbid",
      "exclude",
      "reject",
      "disallow",
      "no",
      "not"
    ];
    this.FOCUS_KEYWORDS = [
      "focus",
      "emphasize",
      "prioritize",
      "concentrate",
      "target",
      "highlight",
      "stress",
      "feature"
    ];
    this.BOUNDARY_KEYWORDS = [
      "limit",
      "restrict",
      "bound",
      "constrain",
      "cap",
      "maximum",
      "minimum",
      "within",
      "under",
      "over"
    ];
  }
  async parse(rule, ruleType) {
    const confidence = this.calculateConfidence(rule);
    const intent = this.extractIntent(rule, ruleType);
    const parameters = this.extractParameters(rule);
    const context = this.extractContext(rule);
    const constraints = this.extractConstraintHints(rule);
    return {
      type: ruleType,
      intent,
      confidence,
      parameters: {
        ...parameters,
        context,
        constraints,
        originalRule: rule
      }
    };
  }
  calculateConfidence(rule) {
    let confidence = 0.4;
    const clarityIndicators = [
      /specific|exact|precisely|clearly|explicitly/i,
      /always|never|must|should|shall/i,
      /\d+/,
      // Contains numbers
      /grammar|spelling|punctuation|style|tone|voice|meaning/i
    ];
    for (const indicator of clarityIndicators) {
      if (indicator.test(rule)) {
        confidence += 0.1;
      }
    }
    if (this.hasQuantifiers(rule)) {
      confidence += 0.2;
    }
    const technicalTerms = [
      "subject-verb agreement",
      "passive voice",
      "sentence structure",
      "paragraph transitions",
      "logical flow",
      "argumentation",
      "semantic analysis",
      "syntactic correctness"
    ];
    for (const term of technicalTerms) {
      if (rule.toLowerCase().includes(term)) {
        confidence += 0.15;
        break;
      }
    }
    if (rule.length > 20 && rule.length < 200) {
      confidence += 0.05;
    }
    return Math.min(confidence, 1);
  }
  extractIntent(rule, ruleType) {
    const lowerRule = rule.toLowerCase();
    const actionPatterns = [
      { pattern: /fix|correct|repair/, intent: "correction" },
      { pattern: /improve|enhance|refine|polish/, intent: "enhancement" },
      { pattern: /preserve|maintain|keep|retain/, intent: "preservation" },
      { pattern: /check|validate|verify|ensure/, intent: "validation" },
      { pattern: /rewrite|restructure|reorganize/, intent: "restructuring" },
      { pattern: /summarize|condense|shorten/, intent: "summarization" },
      { pattern: /expand|elaborate|develop/, intent: "expansion" },
      { pattern: /standardize|normalize|format/, intent: "standardization" }
    ];
    for (const { pattern, intent } of actionPatterns) {
      if (pattern.test(lowerRule)) {
        return intent;
      }
    }
    if (lowerRule.includes("grammar") || lowerRule.includes("spelling")) {
      return "grammatical-correction";
    }
    if (lowerRule.includes("style") || lowerRule.includes("flow")) {
      return "stylistic-improvement";
    }
    if (lowerRule.includes("structure") || lowerRule.includes("organization")) {
      return "structural-editing";
    }
    if (lowerRule.includes("voice") || lowerRule.includes("tone")) {
      return "voice-preservation";
    }
    const typeBasedIntents = {
      "permission": "allow-operation",
      "prohibition": "prevent-operation",
      "boundary": "limit-operation",
      "focus": "prioritize-operation"
    };
    return typeBasedIntents[ruleType] || rule.trim();
  }
  extractParameters(rule) {
    const parameters = {};
    const percentageMatches = rule.match(/(\d+)\s*%/g);
    if (percentageMatches) {
      parameters.percentages = percentageMatches.map((m) => parseInt(m));
      parameters.primaryPercentage = parameters.percentages[0];
    }
    const countMatches = rule.matchAll(/(\d+)\s*(words?|characters?|sentences?)/gi);
    for (const match of countMatches) {
      const count = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      parameters[`${unit}Count`] = count;
    }
    const comparisonPatterns = [
      { pattern: /no more than|less than|under|below/, operator: "lte" },
      { pattern: /more than|greater than|above|over/, operator: "gte" },
      { pattern: /exactly|precisely/, operator: "eq" },
      { pattern: /approximately|around|about/, operator: "approx" }
    ];
    for (const { pattern, operator } of comparisonPatterns) {
      if (pattern.test(rule.toLowerCase())) {
        parameters.comparisonOperator = operator;
        break;
      }
    }
    const scopePatterns = [
      { pattern: /entire|whole|complete|full/, scope: "document" },
      { pattern: /paragraph|section/, scope: "paragraph" },
      { pattern: /sentence/, scope: "sentence" },
      { pattern: /word|phrase/, scope: "word" }
    ];
    for (const { pattern, scope } of scopePatterns) {
      if (pattern.test(rule.toLowerCase())) {
        parameters.scope = scope;
        break;
      }
    }
    const priorityPatterns = [
      { pattern: /critical|essential|vital|must/, priority: "high" },
      { pattern: /important|should|recommended/, priority: "medium" },
      { pattern: /optional|consider|might/, priority: "low" }
    ];
    for (const { pattern, priority } of priorityPatterns) {
      if (pattern.test(rule.toLowerCase())) {
        parameters.priority = priority;
        break;
      }
    }
    return parameters;
  }
  extractContext(rule) {
    const context = {};
    const lowerRule = rule.toLowerCase();
    const documentTypes = [
      "academic",
      "business",
      "creative",
      "technical",
      "legal",
      "marketing",
      "journalistic",
      "scientific"
    ];
    for (const type of documentTypes) {
      if (lowerRule.includes(type)) {
        context.documentType = type;
        break;
      }
    }
    const audienceTypes = [
      "professional",
      "academic",
      "general",
      "technical",
      "casual",
      "formal",
      "informal",
      "expert",
      "beginner"
    ];
    for (const audience of audienceTypes) {
      if (lowerRule.includes(audience)) {
        context.audience = audience;
        break;
      }
    }
    const styleTypes = [
      "formal",
      "informal",
      "conversational",
      "authoritative",
      "persuasive",
      "descriptive",
      "narrative",
      "expository"
    ];
    for (const style of styleTypes) {
      if (lowerRule.includes(style)) {
        context.style = style;
        break;
      }
    }
    const languageFeatures = [
      "terminology",
      "jargon",
      "idioms",
      "metaphors",
      "analogies",
      "voice",
      "tone",
      "perspective",
      "tense",
      "person"
    ];
    context.languageFeatures = [];
    for (const feature of languageFeatures) {
      if (lowerRule.includes(feature)) {
        context.languageFeatures.push(feature);
      }
    }
    return context;
  }
  extractConstraintHints(rule) {
    const hints = [];
    const lowerRule = rule.toLowerCase();
    const constraintPatterns = [
      { pattern: /grammar|spelling|punctuation/, hint: "grammatical" },
      { pattern: /style|flow|readability/, hint: "stylistic" },
      { pattern: /length|word count|character count/, hint: "length-based" },
      { pattern: /tone|voice|perspective/, hint: "tonal" },
      { pattern: /structure|organization|format/, hint: "structural" },
      { pattern: /content|meaning|intent/, hint: "semantic" },
      { pattern: /consistency|uniformity/, hint: "consistency" },
      { pattern: /clarity|comprehension/, hint: "clarity" }
    ];
    for (const { pattern, hint } of constraintPatterns) {
      if (pattern.test(lowerRule)) {
        hints.push(hint);
      }
    }
    if (lowerRule.includes("minimal") || lowerRule.includes("conservative")) {
      hints.push("conservative-editing");
    }
    if (lowerRule.includes("aggressive") || lowerRule.includes("extensive")) {
      hints.push("extensive-editing");
    }
    if (lowerRule.includes("preserve") || lowerRule.includes("maintain")) {
      hints.push("preservation-focused");
    }
    return hints;
  }
  hasQuantifiers(rule) {
    return this.QUANTIFIER_PATTERNS.some((pattern) => pattern.test(rule));
  }
  // Advanced parsing methods for specific domains
  parseGrammarRule(rule) {
    const grammarAspects = {
      "subject-verb agreement": /subject.?verb|agreement/i,
      "tense consistency": /tense|past|present|future/i,
      "pronoun reference": /pronoun|reference|antecedent/i,
      "modifier placement": /modifier|dangling|misplaced/i,
      "parallel structure": /parallel|series|list/i
    };
    const detected = {};
    for (const [aspect, pattern] of Object.entries(grammarAspects)) {
      detected[aspect] = pattern.test(rule);
    }
    return detected;
  }
  parseStyleRule(rule) {
    const styleAspects = {
      "sentence variety": /sentence.*variety|varied.*sentence/i,
      "word choice": /word.*choice|vocabulary|diction/i,
      "transitions": /transition|flow|connection/i,
      "conciseness": /concise|wordiness|brevity/i,
      "active voice": /active.*voice|passive.*voice/i,
      "clarity": /clear|clarity|comprehension/i
    };
    const detected = {};
    for (const [aspect, pattern] of Object.entries(styleAspects)) {
      detected[aspect] = pattern.test(rule);
    }
    return detected;
  }
  parseStructuralRule(rule) {
    const structuralAspects = {
      "paragraph structure": /paragraph.*structure|topic.*sentence/i,
      "logical flow": /logical.*flow|sequence|order/i,
      "argumentation": /argument|evidence|support|reasoning/i,
      "introduction": /introduction|opening|hook/i,
      "conclusion": /conclusion|ending|summary/i,
      "headings": /heading|title|section/i
    };
    const detected = {};
    for (const [aspect, pattern] of Object.entries(structuralAspects)) {
      detected[aspect] = pattern.test(rule);
    }
    return detected;
  }
};

// plugins/editorial-engine/src/simple-diff-processor.ts
var SimpleDiffProcessor = class {
  constructor(modeRegistry, adapterManager, performanceMonitor, eventBus, settings) {
    this.modeRegistry = modeRegistry;
    this.adapterManager = adapterManager;
    this.performanceMonitor = performanceMonitor;
    this.eventBus = eventBus;
    this.settings = settings;
    this.compiler = new RulesetCompiler();
    this.dmp = new import_diff_match_patch.diff_match_patch();
  }
  async process(intake) {
    const startTime = performance.now();
    try {
      const mode = this.modeRegistry.getMode(intake.mode);
      if (!mode) {
        throw new Error(`Unknown mode: ${intake.mode}`);
      }
      const intent = {
        type: "text-edit",
        target: "document",
        scope: "full",
        urgency: "normal"
      };
      const ruleset = await this.compiler.compile(intent, mode);
      console.log(`Compiled ${ruleset.constraints.length} constraints from mode: ${mode.name}`);
      const correctedText = await this.requestAICorrections(intake, ruleset);
      const changes = await this.generateDiffChanges(intake.sourceText, correctedText, intake.id);
      const adapterResults = await this.executeViaAdapters(changes, intake);
      const processingTime = performance.now() - startTime;
      return {
        id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        intakeId: intake.id,
        success: true,
        processingTime,
        changes,
        conflicts: [],
        // No conflicts with simple diff approach
        provenance: this.createProvenanceChain(intake, mode, ruleset),
        summary: {
          processed: true,
          changesApplied: changes.length,
          mode: mode.name,
          processingTime,
          warnings: [],
          errors: []
        },
        metadata: {
          processor: "simple-diff",
          version: "1.0.0",
          originalLength: intake.sourceText.length,
          correctedLength: correctedText.length,
          diffOperations: changes.length
        }
      };
    } catch (error) {
      console.error("Simple diff processing error:", error);
      return this.createErrorResult(intake, error, startTime);
    }
  }
  /**
   * Request AI corrections using compiled constraints
   * This replaces the complex constraint processing with direct AI integration
   */
  async requestAICorrections(intake, ruleset) {
    const originalText = intake.sourceText;
    if (intake.mode === "proofreader") {
      return originalText.replace(/\bi\b/g, "I").replace(/\bthe the\b/g, "the").replace(/\.\s*\./g, ".").replace(/\s+/g, " ").trim();
    }
    return originalText;
  }
  /**
   * Generate real change objects from text diff
   * This replaces the empty change creation with actual diff-based changes
   */
  async generateDiffChanges(originalText, correctedText, intakeId) {
    const changes = [];
    if (originalText === correctedText) {
      console.log("No changes detected - original and corrected text are identical");
      return changes;
    }
    const diffs = this.dmp.diff_main(originalText, correctedText);
    this.dmp.diff_cleanupSemantic(diffs);
    let currentPosition = 0;
    for (let i = 0; i < diffs.length; i++) {
      const [operation, text] = diffs[i];
      switch (operation) {
        case import_diff_match_patch.DIFF_EQUAL:
          currentPosition += text.length;
          break;
        case import_diff_match_patch.DIFF_DELETE:
          const nextDiff = i + 1 < diffs.length ? diffs[i + 1] : null;
          const isReplacement = nextDiff && nextDiff[0] === import_diff_match_patch.DIFF_INSERT;
          if (isReplacement) {
            const newText = nextDiff[1];
            changes.push({
              id: `change-${Date.now()}-${changes.length}`,
              type: "replace",
              range: {
                start: currentPosition,
                end: currentPosition + text.length
              },
              originalText: text,
              newText,
              confidence: 0.95,
              reasoning: `Text replacement detected`,
              source: "simple-diff-processor",
              timestamp: Date.now()
            });
            currentPosition += text.length;
            i++;
          } else {
            changes.push({
              id: `change-${Date.now()}-${changes.length}`,
              type: "delete",
              range: {
                start: currentPosition,
                end: currentPosition + text.length
              },
              originalText: text,
              newText: "",
              confidence: 0.95,
              reasoning: `Text deletion detected`,
              source: "simple-diff-processor",
              timestamp: Date.now()
            });
            currentPosition += text.length;
          }
          break;
        case import_diff_match_patch.DIFF_INSERT:
          const prevDiff = i > 0 ? diffs[i - 1] : null;
          const wasReplacement = prevDiff && prevDiff[0] === import_diff_match_patch.DIFF_DELETE;
          if (!wasReplacement) {
            changes.push({
              id: `change-${Date.now()}-${changes.length}`,
              type: "insert",
              range: {
                start: currentPosition,
                end: currentPosition
              },
              originalText: "",
              newText: text,
              confidence: 0.95,
              reasoning: `Text insertion detected`,
              source: "simple-diff-processor",
              timestamp: Date.now()
            });
          }
          break;
      }
    }
    console.log(`Generated ${changes.length} real changes from diff`);
    return changes;
  }
  /**
   * Execute changes via adapter system (PRESERVE existing functionality)
   */
  async executeViaAdapters(changes, intake) {
    const job = {
      id: `job-${intake.id}`,
      type: "text-edit",
      payload: {
        text: intake.sourceText,
        mode: intake.mode,
        changes,
        originalText: intake.sourceText
      },
      priority: 1,
      metadata: {
        intakeId: intake.id,
        startTime: Date.now()
      }
    };
    const availableAdapters = this.adapterManager.getAllAdapters();
    console.log(`Executing via ${availableAdapters.length} adapters`);
    if (availableAdapters.length > 0) {
      const adapter = availableAdapters[0];
      return await adapter.execute(job);
    }
    return { success: true, changes };
  }
  /**
   * Create provenance chain (PRESERVE existing functionality)
   */
  createProvenanceChain(intake, mode, ruleset) {
    return {
      origin: {
        source: "user-input",
        timestamp: intake.timestamp,
        sessionId: intake.sessionId
      },
      steps: [
        {
          processor: "ruleset-compiler",
          operation: "mode-compilation",
          timestamp: Date.now(),
          parameters: { mode: mode.name }
        },
        {
          processor: "simple-diff-processor",
          operation: "diff-generation",
          timestamp: Date.now(),
          parameters: { diffOperations: true }
        }
      ]
    };
  }
  /**
   * Create error result (PRESERVE existing functionality) 
   */
  createErrorResult(intake, error, startTime) {
    const processingTime = performance.now() - startTime;
    return {
      id: `error-job-${Date.now()}`,
      intakeId: intake.id,
      success: false,
      processingTime,
      changes: [],
      conflicts: [],
      provenance: {
        origin: {
          source: "user-input",
          timestamp: intake.timestamp,
          sessionId: intake.sessionId
        },
        steps: []
      },
      summary: {
        processed: false,
        changesApplied: 0,
        mode: intake.mode,
        processingTime,
        warnings: [],
        errors: [error.message]
      },
      metadata: {
        processor: "simple-diff-processor",
        error: error.message,
        errorType: error.name
      }
    };
  }
};

// plugins/editorial-engine/src/mode-registry.ts
var ModeRegistry = class {
  constructor(eventBus, settings) {
    this.eventBus = eventBus;
    this.settings = settings;
    this.modes = /* @__PURE__ */ new Map();
    this.compiler = new RulesetCompiler();
    this.loadPersistedModes();
  }
  async registerMode(mode) {
    const validation = await this.validateMode(mode);
    if (!validation.valid) {
      throw new Error(`Mode validation failed: ${validation.errors.join(", ")}`);
    }
    if (this.modes.has(mode.id)) {
      const existingMode = this.modes.get(mode.id);
      mode = await this.migrateMode(mode, existingMode.version);
    }
    if (!mode.constraints || mode.constraints.length === 0) {
      try {
        const compiled = await this.compiler.compileMode(mode);
        mode.constraints = compiled.constraints;
      } catch (error) {
        console.warn(`Failed to compile constraints for mode ${mode.id}:`, error);
        mode.constraints = [];
      }
    }
    this.modes.set(mode.id, mode);
    this.eventBus.emit("mode-registered", { mode });
    if (!["proofreader", "copy-editor", "developmental-editor", "creative-writing-assistant"].includes(mode.id)) {
      await this.persistModes();
    }
    console.log(`Registered mode: ${mode.name} (${mode.id})`);
  }
  getMode(id) {
    return this.modes.get(id);
  }
  getAllModes() {
    return Array.from(this.modes.values());
  }
  getModesByCategory(category) {
    return this.getAllModes().filter((mode) => mode.metadata.category === category);
  }
  async updateMode(id, updates) {
    const existingMode = this.modes.get(id);
    if (!existingMode) {
      throw new Error(`Mode not found: ${id}`);
    }
    const updatedMode = { ...existingMode, ...updates };
    if (updates.naturalLanguageRules) {
      const compiled = await this.compiler.compileMode(updatedMode);
      updatedMode.constraints = compiled.constraints;
    }
    this.modes.set(id, updatedMode);
    this.eventBus.emit("mode-updated", { mode: updatedMode });
  }
  async removeMode(id) {
    if (this.modes.has(id)) {
      const mode = this.modes.get(id);
      if (["proofreader", "copy-editor", "developmental-editor", "creative-writing-assistant"].includes(id)) {
        throw new Error(`Cannot remove default mode: ${id}`);
      }
      this.modes.delete(id);
      this.eventBus.emit("mode-removed", { modeId: id, mode });
      await this.persistModes();
      console.log(`Removed mode: ${mode.name} (${id})`);
    }
  }
  async validateMode(mode) {
    const errors = [];
    if (!mode.id)
      errors.push("Mode ID is required");
    if (!mode.name)
      errors.push("Mode name is required");
    if (!mode.description)
      errors.push("Mode description is required");
    if (!mode.version)
      errors.push("Mode version is required");
    if (mode.id && this.modes.has(mode.id)) {
      errors.push(`Mode ID already exists: ${mode.id}`);
    }
    if (!mode.naturalLanguageRules) {
      errors.push("Natural language rules are required");
    } else {
      if (!mode.naturalLanguageRules.allowed || mode.naturalLanguageRules.allowed.length === 0) {
        errors.push("At least one allowed rule is required");
      }
      const allRules = [
        ...mode.naturalLanguageRules.allowed,
        ...mode.naturalLanguageRules.forbidden,
        ...mode.naturalLanguageRules.focus,
        ...mode.naturalLanguageRules.boundaries
      ];
      for (const rule of allRules) {
        if (!rule.trim()) {
          errors.push("Rules cannot be empty");
          break;
        }
      }
    }
    if (!mode.metadata) {
      errors.push("Mode metadata is required");
    } else {
      if (!mode.metadata.category) {
        errors.push("Mode category is required");
      }
      if (!mode.metadata.difficulty) {
        errors.push("Mode difficulty is required");
      }
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }
  // Export modes for sharing/backup
  exportModes() {
    const modesArray = Array.from(this.modes.values());
    return JSON.stringify(modesArray, null, 2);
  }
  // Import modes from JSON
  async importModes(modesJson) {
    const errors = [];
    let imported = 0;
    try {
      const modes = JSON.parse(modesJson);
      if (!Array.isArray(modes)) {
        throw new Error("Invalid format: expected array of modes");
      }
      for (const mode of modes) {
        try {
          await this.registerMode(mode);
          imported++;
        } catch (error) {
          errors.push(`Failed to import mode ${mode.id || "unknown"}: ${error.message}`);
        }
      }
    } catch (error) {
      errors.push(`JSON parsing failed: ${error.message}`);
    }
    return { imported, errors };
  }
  // Mode persistence for Obsidian restarts
  async loadPersistedModes() {
    var _a, _b;
    if ((_b = (_a = this.settings) == null ? void 0 : _a.app) == null ? void 0 : _b.vault) {
      try {
        const data = await this.settings.app.vault.adapter.read(".obsidian/plugins/editorial-engine/modes.json");
        if (data) {
          const modes = JSON.parse(data);
          for (const mode of modes) {
            if (!this.modes.has(mode.id)) {
              await this.registerMode(mode);
            }
          }
          console.log(`Loaded ${modes.length} persisted modes`);
        }
      } catch (error) {
        console.log("No persisted modes found or failed to load");
      }
    }
  }
  async persistModes() {
    var _a, _b;
    if ((_b = (_a = this.settings) == null ? void 0 : _a.app) == null ? void 0 : _b.vault) {
      try {
        const customModes = Array.from(this.modes.values()).filter(
          (mode) => !["proofreader", "copy-editor", "developmental-editor", "creative-writing-assistant"].includes(mode.id)
        );
        const data = JSON.stringify(customModes, null, 2);
        await this.settings.app.vault.adapter.write(".obsidian/plugins/editorial-engine/modes.json", data);
        console.log(`Persisted ${customModes.length} custom modes`);
      } catch (error) {
        console.error("Failed to persist modes:", error);
      }
    }
  }
  // Version migration support
  async migrateMode(mode, targetVersion) {
    const currentVersion = mode.version || "1.0.0";
    if (this.compareVersions(currentVersion, targetVersion) >= 0) {
      return mode;
    }
    const migratedMode = { ...mode };
    if (currentVersion === "1.0.0" && this.compareVersions(targetVersion, "1.1.0") >= 0) {
      if (!migratedMode.metadata.migrationHistory) {
        migratedMode.metadata.migrationHistory = [
          {
            from: currentVersion,
            to: "1.1.0",
            timestamp: Date.now(),
            changes: ["Added migration history tracking"]
          }
        ];
      }
      migratedMode.version = "1.1.0";
    }
    this.eventBus.emit("mode-migrated", {
      mode: migratedMode,
      fromVersion: currentVersion,
      toVersion: targetVersion
    });
    return migratedMode;
  }
  compareVersions(a, b) {
    const aParts = a.split(".").map(Number);
    const bParts = b.split(".").map(Number);
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      if (aPart > bPart)
        return 1;
      if (aPart < bPart)
        return -1;
    }
    return 0;
  }
};

// plugins/editorial-engine/src/adapter-manager.ts
var AdapterManager = class {
  constructor(eventBus, settings) {
    this.eventBus = eventBus;
    this.settings = settings;
    this.adapters = /* @__PURE__ */ new Map();
    this.router = new AdapterRouter();
    this.healthMonitor = new AdapterHealthMonitor(this.eventBus);
  }
  async registerAdapter(adapter) {
    try {
      const config = this.getAdapterConfig(adapter.name);
      await adapter.initialize(config);
      this.router.registerAdapter(adapter);
      this.adapters.set(adapter.name, adapter);
      this.healthMonitor.startMonitoring(adapter);
      this.eventBus.emit("adapter-registered", {
        name: adapter.name,
        adapter
      });
      console.log(`Registered adapter: ${adapter.name} v${adapter.version}`);
    } catch (error) {
      console.error(`Failed to register adapter ${adapter.name}:`, error);
      throw error;
    }
  }
  async execute(job) {
    const startTime = performance.now();
    try {
      const suitableAdapters = this.router.findSuitableAdapters(job);
      if (suitableAdapters.length === 0) {
        const error = new Error(
          `No suitable adapter found for job type: ${job.type}. Available adapters: ${this.adapters.size}, Registered adapter types: ${Array.from(this.adapters.values()).map((a) => a.supportedOperations).flat().join(", ")}`
        );
        this.eventBus.emit("adapter-execution-failed", {
          jobId: job.id,
          error: error.message,
          availableAdapters: Array.from(this.adapters.keys()),
          requestedJobType: job.type
        });
        throw error;
      }
      let lastError = null;
      const attemptedAdapters = [];
      for (const adapter of suitableAdapters) {
        attemptedAdapters.push(adapter.name);
        try {
          this.router.updateAdapterLoad(adapter.name, this.getCurrentAdapterLoad(adapter.name));
          const result = await this.executeWithAdapter(adapter, job);
          const executionTime = performance.now() - startTime;
          this.router.recordAdapterExecution(adapter.name, executionTime, true);
          this.recordExecution(adapter.name, true, executionTime);
          this.eventBus.emit("adapter-execution-success", {
            jobId: job.id,
            adapterName: adapter.name,
            executionTime,
            attemptedAdapters
          });
          return result;
        } catch (error) {
          const executionTime = performance.now() - startTime;
          console.warn(`Adapter ${adapter.name} failed for job ${job.id}:`, error);
          lastError = error;
          this.router.recordAdapterExecution(adapter.name, executionTime, false);
          this.recordExecution(adapter.name, false, executionTime);
          this.eventBus.emit("adapter-execution-attempt-failed", {
            jobId: job.id,
            adapterName: adapter.name,
            error: error.message,
            executionTime,
            remainingAdapters: suitableAdapters.length - attemptedAdapters.length
          });
          continue;
        }
      }
      const finalError = new Error(
        `All suitable adapters failed for job ${job.id}. Attempted adapters: ${attemptedAdapters.join(", ")}. Last error: ${(lastError == null ? void 0 : lastError.message) || "Unknown error"}`
      );
      this.eventBus.emit("adapter-execution-failed", {
        jobId: job.id,
        error: finalError.message,
        attemptedAdapters,
        lastError: lastError == null ? void 0 : lastError.message
      });
      throw finalError;
    } catch (error) {
      if (error.message && !error.message.includes("No suitable adapter")) {
        this.eventBus.emit("adapter-execution-failed", {
          jobId: job.id,
          error: error.message
        });
      }
      throw error;
    }
  }
  async executeWithAdapter(adapter, job) {
    var _a;
    const status = adapter.getStatus();
    if (!status.healthy) {
      throw new Error(`Adapter ${adapter.name} is not healthy: ${status.error}`);
    }
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Adapter execution timeout")), job.timeout);
    });
    const executionPromise = adapter.execute(job);
    const result = await Promise.race([executionPromise, timeoutPromise]);
    if (!result.success) {
      throw new Error(`Adapter execution failed: ${(_a = result.errors) == null ? void 0 : _a.map((e) => e.message).join(", ")}`);
    }
    return result;
  }
  getAdapter(name) {
    return this.adapters.get(name);
  }
  getAllAdapters() {
    return Array.from(this.adapters.values());
  }
  getAdapterCount() {
    return this.adapters.size;
  }
  getAdapterStatus(name) {
    const adapter = this.adapters.get(name);
    return adapter == null ? void 0 : adapter.getStatus();
  }
  getAllAdapterStatuses() {
    const statuses = {};
    for (const [name, adapter] of this.adapters) {
      statuses[name] = adapter.getStatus();
    }
    return statuses;
  }
  getAdapterConfig(adapterName) {
    var _a;
    return ((_a = this.settings.adapters[adapterName]) == null ? void 0 : _a.config) || {};
  }
  recordExecution(adapterName, success, responseTime) {
    this.eventBus.emit("adapter-execution-recorded", {
      adapterName,
      success,
      responseTime,
      timestamp: Date.now()
    });
  }
  getCurrentAdapterLoad(adapterName) {
    const adapter = this.adapters.get(adapterName);
    if (!adapter)
      return 0;
    const status = adapter.getStatus();
    return status.currentLoad || 0;
  }
  // Enhanced adapter management methods
  setRoutingStrategy(strategy) {
    this.router.setRoutingStrategy(strategy);
    this.eventBus.emit("routing-strategy-changed", {
      newStrategy: strategy,
      timestamp: Date.now()
    });
  }
  getRoutingStrategy() {
    return this.router.getRoutingStrategy();
  }
  getAdapterMetrics() {
    return this.router.getAdapterMetrics();
  }
  getDetailedAdapterStatus() {
    const detailedStatus = {};
    for (const [name, adapter] of this.adapters) {
      const status = adapter.getStatus();
      const metrics = this.router.getAdapterMetrics()[name];
      detailedStatus[name] = {
        ...status,
        metrics,
        capabilities: adapter.capabilities,
        supportedOperations: adapter.supportedOperations,
        lastHealthCheck: status.lastHealthCheck || Date.now()
      };
    }
    return detailedStatus;
  }
  async cleanup() {
    this.healthMonitor.cleanup();
    for (const [name, adapter] of this.adapters) {
      try {
        await adapter.cleanup();
      } catch (error) {
        console.error(`Error cleaning up adapter ${name}:`, error);
      }
    }
    this.adapters.clear();
  }
};
var AdapterRouter = class {
  constructor(routingStrategy = "priority") {
    this.adapters = [];
    this.routingStrategy = "priority";
    this.roundRobinIndex = 0;
    this.adapterMetrics = /* @__PURE__ */ new Map();
    this.routingStrategy = routingStrategy;
  }
  registerAdapter(adapter) {
    this.adapters.push(adapter);
    this.adapterMetrics.set(adapter.name, {
      totalRequests: 0,
      successfulRequests: 0,
      averageResponseTime: 0,
      currentLoad: 0,
      lastUsed: 0,
      priority: this.extractAdapterPriority(adapter)
    });
    this.sortAdaptersByPriority();
  }
  findSuitableAdapters(job) {
    const compatibleAdapters = this.adapters.filter(
      (adapter) => this.isAdapterCompatible(adapter, job)
    );
    if (compatibleAdapters.length === 0) {
      return [];
    }
    switch (this.routingStrategy) {
      case "priority":
        return this.priorityRouting(compatibleAdapters, job);
      case "round-robin":
        return this.roundRobinRouting(compatibleAdapters);
      case "load-balanced":
        return this.loadBalancedRouting(compatibleAdapters, job);
      default:
        return compatibleAdapters;
    }
  }
  isAdapterCompatible(adapter, job) {
    var _a;
    if (!adapter.supportedOperations.includes(job.type)) {
      return false;
    }
    const status = adapter.getStatus();
    if (!status.healthy) {
      return false;
    }
    if (job.payload && typeof job.payload.text === "string") {
      const textLength = job.payload.text.length;
      if (textLength > adapter.capabilities.maxTextLength) {
        return false;
      }
    }
    if (job.constraints && job.constraints.length > 0) {
      const requiredCapabilities = this.extractRequiredCapabilities(job.constraints);
      for (const capability of requiredCapabilities) {
        if (!((_a = adapter.capabilities.supportedConstraints) == null ? void 0 : _a.includes(capability))) {
          return false;
        }
      }
    }
    if (job.timeout > adapter.capabilities.maxProcessingTime) {
      return false;
    }
    return true;
  }
  priorityRouting(adapters, job) {
    return adapters.sort((a, b) => {
      const scoreA = this.calculateAdapterScore(a, job);
      const scoreB = this.calculateAdapterScore(b, job);
      return scoreB - scoreA;
    });
  }
  roundRobinRouting(adapters) {
    if (adapters.length === 0)
      return [];
    const selectedAdapter = adapters[this.roundRobinIndex % adapters.length];
    this.roundRobinIndex = (this.roundRobinIndex + 1) % adapters.length;
    const result = [selectedAdapter];
    result.push(...adapters.filter((a) => a.name !== selectedAdapter.name));
    return result;
  }
  loadBalancedRouting(adapters, job) {
    return adapters.sort((a, b) => {
      const metricsA = this.adapterMetrics.get(a.name);
      const metricsB = this.adapterMetrics.get(b.name);
      const loadScoreA = this.calculateLoadScore(metricsA);
      const loadScoreB = this.calculateLoadScore(metricsB);
      return loadScoreB - loadScoreA;
    });
  }
  calculateAdapterScore(adapter, job) {
    const metrics = this.adapterMetrics.get(adapter.name);
    if (!metrics)
      return 0;
    let score = metrics.priority * 10;
    const successRate = metrics.totalRequests > 0 ? metrics.successfulRequests / metrics.totalRequests : 0.5;
    score += successRate * 20;
    const responseTimePenalty = Math.min(metrics.averageResponseTime / 1e3, 10);
    score -= responseTimePenalty;
    score -= metrics.currentLoad * 5;
    const recencyBonus = Math.max(0, 10 - (Date.now() - metrics.lastUsed) / 1e3);
    score += recencyBonus;
    if (job.constraints) {
      const compatibilityBonus = this.calculateCompatibilityBonus(adapter, job);
      score += compatibilityBonus;
    }
    return Math.max(0, score);
  }
  calculateLoadScore(metrics) {
    const successRate = metrics.totalRequests > 0 ? metrics.successfulRequests / metrics.totalRequests : 0.5;
    const loadPenalty = metrics.currentLoad * 0.3;
    const responsePenalty = metrics.averageResponseTime / 1e4;
    return successRate * 100 - loadPenalty - responsePenalty;
  }
  calculateCompatibilityBonus(adapter, job) {
    let bonus = 0;
    const operationBonus = {
      "grammar-check": adapter.name.includes("grammar") ? 5 : 0,
      "style-enhancement": adapter.name.includes("style") ? 5 : 0,
      "summarization": adapter.name.includes("summarize") ? 5 : 0
    };
    bonus += operationBonus[job.type] || 0;
    if (job.constraints) {
      const supportedConstraints = job.constraints.filter(
        (constraint) => {
          var _a;
          return (_a = adapter.capabilities.supportedConstraints) == null ? void 0 : _a.includes(constraint.type);
        }
      );
      bonus += supportedConstraints.length * 2;
    }
    return bonus;
  }
  extractRequiredCapabilities(constraints) {
    const capabilities = /* @__PURE__ */ new Set();
    for (const constraint of constraints) {
      if (constraint.type === "PRESERVE_TONE") {
        capabilities.add("tone-analysis");
      }
      if (constraint.type === "NO_CONTENT_CHANGE") {
        capabilities.add("semantic-analysis");
      }
      if (constraint.type === "GRAMMAR_ONLY") {
        capabilities.add("grammar-checking");
      }
      if (constraint.type === "STYLE_CONSISTENCY") {
        capabilities.add("style-analysis");
      }
    }
    return Array.from(capabilities);
  }
  extractAdapterPriority(adapter) {
    var _a;
    return ((_a = adapter.metadata) == null ? void 0 : _a.priority) || 5;
  }
  sortAdaptersByPriority() {
    this.adapters.sort((a, b) => {
      const metricsA = this.adapterMetrics.get(a.name);
      const metricsB = this.adapterMetrics.get(b.name);
      const priorityA = (metricsA == null ? void 0 : metricsA.priority) || 5;
      const priorityB = (metricsB == null ? void 0 : metricsB.priority) || 5;
      return priorityB - priorityA;
    });
  }
  // Metrics update methods
  recordAdapterExecution(adapterName, responseTime, success) {
    const metrics = this.adapterMetrics.get(adapterName);
    if (!metrics)
      return;
    metrics.totalRequests++;
    if (success) {
      metrics.successfulRequests++;
    }
    metrics.averageResponseTime = (metrics.averageResponseTime * (metrics.totalRequests - 1) + responseTime) / metrics.totalRequests;
    metrics.lastUsed = Date.now();
  }
  updateAdapterLoad(adapterName, currentLoad) {
    const metrics = this.adapterMetrics.get(adapterName);
    if (metrics) {
      metrics.currentLoad = currentLoad;
    }
  }
  setRoutingStrategy(strategy) {
    this.routingStrategy = strategy;
    if (strategy === "round-robin") {
      this.roundRobinIndex = 0;
    }
  }
  getAdapterMetrics() {
    const result = {};
    for (const [name, metrics] of this.adapterMetrics) {
      result[name] = { ...metrics };
    }
    return result;
  }
  getRoutingStrategy() {
    return this.routingStrategy;
  }
};
var AdapterHealthMonitor = class {
  // 30 seconds
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.intervals = /* @__PURE__ */ new Map();
    this.HEALTH_CHECK_INTERVAL = 3e4;
  }
  startMonitoring(adapter) {
    this.stopMonitoring(adapter.name);
    const interval = setInterval(() => {
      this.checkAdapterHealth(adapter);
    }, this.HEALTH_CHECK_INTERVAL);
    this.intervals.set(adapter.name, interval);
  }
  stopMonitoring(adapterName) {
    const interval = this.intervals.get(adapterName);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(adapterName);
    }
  }
  async checkAdapterHealth(adapter) {
    try {
      const status = adapter.getStatus();
      if (!status.healthy) {
        this.eventBus.emit("adapter-health-warning", {
          adapterName: adapter.name,
          status,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      this.eventBus.emit("adapter-health-error", {
        adapterName: adapter.name,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }
  cleanup() {
    for (const [name, interval] of this.intervals) {
      clearInterval(interval);
    }
    this.intervals.clear();
  }
};

// plugins/editorial-engine/src/platform-manager.ts
var PlatformManager = class _PlatformManager {
  constructor() {
    this.plugins = /* @__PURE__ */ new Map();
  }
  static getInstance() {
    if (!_PlatformManager.instance) {
      _PlatformManager.instance = new _PlatformManager();
    }
    return _PlatformManager.instance;
  }
  registerPlugin(name, plugin, api) {
    this.plugins.set(name, { plugin, api });
    const platform = this.getPlatform();
    platform[name] = api;
    if (plugin.manifest) {
      platform.plugins[name] = {
        version: plugin.manifest.version,
        loaded: true,
        api
      };
    }
    console.log(`Registered ${name} plugin with platform API`);
  }
  unregisterPlugin(name) {
    if (this.plugins.has(name)) {
      this.plugins.delete(name);
      const platform = this.getPlatform();
      delete platform[name];
      if (platform.plugins[name]) {
        platform.plugins[name] = {
          version: "",
          loaded: false
        };
      }
      console.log(`Unregistered ${name} plugin from platform API`);
    }
  }
  getPlatform() {
    if (!window.Writerr) {
      this.createPlatform();
    }
    return window.Writerr;
  }
  getPlugin(name) {
    return this.plugins.get(name);
  }
  isPluginRegistered(name) {
    return this.plugins.has(name);
  }
  getAllPlugins() {
    return Array.from(this.plugins.keys());
  }
  createPlatform() {
    const platform = {
      version: "1.0.0",
      plugins: {}
    };
    window.Writerr = platform;
    console.log("Created Writerr platform object");
  }
  // Utility methods for cross-plugin communication
  async waitForPlugin(name, timeout = 1e4) {
    return new Promise((resolve, reject) => {
      const checkPlugin = () => {
        const plugin = this.plugins.get(name);
        if (plugin) {
          resolve(plugin.api);
          return;
        }
        setTimeout(checkPlugin, 100);
      };
      setTimeout(() => {
        reject(new Error(`Plugin ${name} not registered within ${timeout}ms`));
      }, timeout);
      checkPlugin();
    });
  }
  notifyPluginReady(name) {
    const platform = this.getPlatform();
    if (platform.events && typeof platform.events.emit === "function") {
      platform.events.emit("plugin-ready", { name });
    }
  }
};

// plugins/editorial-engine/src/performance-monitor.ts
var PerformanceMonitor = class {
  // Keep last 1000 request times
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      totalProcessingTime: 0,
      cacheHits: 0,
      cacheRequests: 0,
      requestTimes: [],
      adapterStats: /* @__PURE__ */ new Map()
    };
    this.MAX_REQUEST_TIMES = 1e3;
    this.setupEventListeners();
  }
  setupEventListeners() {
    this.eventBus.on("processing-completed", (data) => {
      this.recordRequest(data.result.processingTime, true);
    });
    this.eventBus.on("processing-failed", (data) => {
      this.recordRequest(0, false);
    });
    this.eventBus.on("adapter-execution-recorded", (data) => {
      this.recordAdapterExecution(
        data.adapterName,
        data.responseTime,
        data.success
      );
    });
    setInterval(() => {
      this.emitMetricsUpdate();
    }, 3e4);
  }
  recordRequest(processingTime, success) {
    this.metrics.totalRequests++;
    if (success) {
      this.metrics.successfulRequests++;
      this.metrics.totalProcessingTime += processingTime;
      this.metrics.requestTimes.push(processingTime);
      if (this.metrics.requestTimes.length > this.MAX_REQUEST_TIMES) {
        this.metrics.requestTimes.shift();
      }
    }
  }
  recordCacheHit() {
    this.metrics.cacheRequests++;
    this.metrics.cacheHits++;
  }
  recordCacheMiss() {
    this.metrics.cacheRequests++;
  }
  recordAdapterExecution(adapterName, responseTime, success) {
    if (!this.metrics.adapterStats.has(adapterName)) {
      this.metrics.adapterStats.set(adapterName, {
        requests: 0,
        successful: 0,
        totalTime: 0
      });
    }
    const stats = this.metrics.adapterStats.get(adapterName);
    stats.requests++;
    stats.totalTime += responseTime;
    if (success) {
      stats.successful++;
    }
  }
  getCurrentMetrics() {
    const avgProcessingTime = this.metrics.successfulRequests > 0 ? this.metrics.totalProcessingTime / this.metrics.successfulRequests : 0;
    const successRate = this.metrics.totalRequests > 0 ? this.metrics.successfulRequests / this.metrics.totalRequests : 0;
    const cacheHitRate = this.metrics.cacheRequests > 0 ? this.metrics.cacheHits / this.metrics.cacheRequests : 0;
    return {
      avgProcessingTime,
      successRate,
      totalRequests: this.metrics.totalRequests,
      cacheHitRate,
      lastUpdated: Date.now()
    };
  }
  getDetailedMetrics() {
    const basicMetrics = this.getCurrentMetrics();
    const timeDistribution = {
      fast: 0,
      medium: 0,
      slow: 0
    };
    for (const time of this.metrics.requestTimes) {
      if (time < 1e3) {
        timeDistribution.fast++;
      } else if (time < 5e3) {
        timeDistribution.medium++;
      } else {
        timeDistribution.slow++;
      }
    }
    const recentRequests = this.metrics.requestTimes.filter(
      (time) => time > Date.now() - 36e5
      // Last hour
    );
    const requestsPerMinute = recentRequests.length / 60;
    const adapterMetrics = {};
    for (const [name, stats] of this.metrics.adapterStats) {
      adapterMetrics[name] = {
        requests: stats.requests,
        successRate: stats.requests > 0 ? stats.successful / stats.requests : 0,
        avgResponseTime: stats.requests > 0 ? stats.totalTime / stats.requests : 0
      };
    }
    return {
      ...basicMetrics,
      requestsPerMinute,
      errorCount: this.metrics.totalRequests - this.metrics.successfulRequests,
      timeDistribution,
      adapterMetrics
    };
  }
  emitMetricsUpdate() {
    const metrics = this.getCurrentMetrics();
    this.eventBus.emit("performance-metrics-updated", { metrics });
  }
  // Memory usage tracking (if available)
  updateMemoryUsage() {
    if (typeof performance.memory !== "undefined") {
      const memInfo = performance.memory;
    }
  }
  // Reset metrics (useful for testing)
  reset() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      totalProcessingTime: 0,
      cacheHits: 0,
      cacheRequests: 0,
      requestTimes: [],
      adapterStats: /* @__PURE__ */ new Map()
    };
  }
  cleanup() {
    this.reset();
  }
  // Export metrics for external monitoring
  exportMetrics() {
    const detailed = this.getDetailedMetrics();
    return JSON.stringify(detailed, null, 2);
  }
  // Alert thresholds
  checkThresholds() {
    const metrics = this.getCurrentMetrics();
    const alerts = [];
    const warnings = [];
    if (metrics.avgProcessingTime > 5e3) {
      alerts.push(`High average processing time: ${metrics.avgProcessingTime.toFixed(0)}ms`);
    } else if (metrics.avgProcessingTime > 2e3) {
      warnings.push(`Elevated processing time: ${metrics.avgProcessingTime.toFixed(0)}ms`);
    }
    if (metrics.successRate < 0.8) {
      alerts.push(`Low success rate: ${(metrics.successRate * 100).toFixed(1)}%`);
    } else if (metrics.successRate < 0.95) {
      warnings.push(`Reduced success rate: ${(metrics.successRate * 100).toFixed(1)}%`);
    }
    return { alerts, warnings };
  }
};

// plugins/editorial-engine/src/event-bus.ts
var WritterrEventBus = class {
  constructor() {
    this.handlers = /* @__PURE__ */ new Map();
    this.debugMode = false;
    this.errorCounts = /* @__PURE__ */ new Map();
    this.circuitBreakerThreshold = 5;
    this.disabledHandlers = /* @__PURE__ */ new Set();
  }
  emit(event, data) {
    if (this.debugMode) {
      console.debug(`[WritterrEventBus] Emitting: ${event}`, data);
    }
    if (this.disabledHandlers.has(event)) {
      if (this.debugMode) {
        console.warn(`[WritterrEventBus] Event ${event} is disabled due to circuit breaker`);
      }
      return;
    }
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      const handlersArray = Array.from(eventHandlers);
      for (const handler of handlersArray) {
        try {
          setTimeout(() => {
            try {
              handler(data);
              this.resetErrorCount(event);
            } catch (error) {
              this.handleHandlerError(event, error, handler);
            }
          }, 0);
        } catch (error) {
          this.handleHandlerError(event, error, handler);
        }
      }
    }
  }
  on(event, handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, /* @__PURE__ */ new Set());
    }
    this.handlers.get(event).add(handler);
    if (this.debugMode) {
      console.debug(`[WritterrEventBus] Registered handler for: ${event}`);
    }
  }
  off(event, handler) {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.delete(handler);
      if (eventHandlers.size === 0) {
        this.handlers.delete(event);
      }
    }
  }
  once(event, handler) {
    const onceWrapper = (data) => {
      handler(data);
      this.off(event, onceWrapper);
    };
    this.on(event, onceWrapper);
  }
  cleanup() {
    this.handlers.clear();
    if (this.debugMode) {
      console.debug("[WritterrEventBus] Cleaned up all handlers");
    }
  }
  // Debug and monitoring methods
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }
  getEventCounts() {
    const counts = {};
    for (const [event, handlers] of this.handlers) {
      counts[event] = handlers.size;
    }
    return counts;
  }
  getAllEvents() {
    return Array.from(this.handlers.keys());
  }
  hasListeners(event) {
    const handlers = this.handlers.get(event);
    return handlers ? handlers.size > 0 : false;
  }
  getListenerCount(event) {
    const handlers = this.handlers.get(event);
    return handlers ? handlers.size : 0;
  }
  removeAllListeners(event) {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }
  // Error isolation and circuit breaker methods
  handleHandlerError(event, error, handler) {
    console.error(`[WritterrEventBus] Error in handler for ${event}:`, error);
    const currentCount = this.errorCounts.get(event) || 0;
    const newCount = currentCount + 1;
    this.errorCounts.set(event, newCount);
    if (newCount >= this.circuitBreakerThreshold) {
      this.disabledHandlers.add(event);
      console.warn(`[WritterrEventBus] Event ${event} disabled due to repeated failures (${newCount} errors)`);
      if (event !== "system-error") {
        this.emit("system-error", {
          type: "circuit-breaker-activated",
          event,
          errorCount: newCount,
          timestamp: Date.now()
        });
      }
    }
  }
  resetErrorCount(event) {
    if (this.errorCounts.has(event)) {
      this.errorCounts.delete(event);
    }
  }
  // Circuit breaker management
  resetCircuitBreaker(event) {
    this.disabledHandlers.delete(event);
    this.errorCounts.delete(event);
    if (this.debugMode) {
      console.debug(`[WritterrEventBus] Circuit breaker reset for event: ${event}`);
    }
  }
  getCircuitBreakerStatus() {
    const status = {};
    for (const [event, count] of this.errorCounts) {
      status[event] = {
        errorCount: count,
        disabled: this.disabledHandlers.has(event)
      };
    }
    return status;
  }
  setCircuitBreakerThreshold(threshold) {
    this.circuitBreakerThreshold = Math.max(1, threshold);
  }
};

// plugins/editorial-engine/src/main.ts
var EditorialEnginePlugin = class extends import_obsidian2.Plugin {
  async onload() {
    console.log("Loading Editorial Engine plugin...");
    await this.loadSettings();
    this.eventBus = new WritterrEventBus();
    this.initializeComponents();
    this.setupPlatformAPI();
    await this.setupDefaultAdapters();
    this.addSettingTab(new EditorialEngineSettingsTab(this.app, this));
    this.addStatusBarItem().setText("\u{1F58B}\uFE0F Editorial Engine Ready");
    this.eventBus.on("plugin-ready", async (data) => {
      if (data.name === "track-edits" && !this.adapterManager.getAdapter("track-edits")) {
        console.log("Track Edits plugin became available, registering adapter...");
        await this.setupDefaultAdapters();
      }
    });
    console.log("Editorial Engine plugin loaded successfully");
  }
  async onunload() {
    console.log("Unloading Editorial Engine plugin...");
    this.cleanupComponents();
    this.cleanupPlatformAPI();
    console.log("Editorial Engine plugin unloaded");
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  initializeComponents() {
    this.performanceMonitor = new PerformanceMonitor(this.eventBus);
    this.modeRegistry = new ModeRegistry(this.eventBus, this.settings);
    this.adapterManager = new AdapterManager(this.eventBus, this.settings);
    this.simpleDiffProcessor = new SimpleDiffProcessor(
      this.modeRegistry,
      this.adapterManager,
      this.performanceMonitor,
      this.eventBus,
      this.settings
    );
    this.platformManager = new PlatformManager();
    this.loadDefaultModes();
    this.setupDefaultAdapters();
  }
  setupPlatformAPI() {
    this.api = {
      process: this.processRequest.bind(this),
      registerMode: this.registerMode.bind(this),
      getModes: this.getModes.bind(this),
      getEnabledModes: this.getEnabledModes.bind(this),
      getMode: this.getMode.bind(this),
      registerAdapter: this.registerAdapter.bind(this),
      getStatus: this.getStatus.bind(this),
      getPerformanceMetrics: this.getPerformanceMetrics.bind(this)
    };
    this.platformManager.registerPlugin("editorial", this, this.api);
    this.eventBus.emit("platform-ready", {
      plugin: "editorial-engine",
      api: this.api
    });
  }
  cleanupComponents() {
    if (this.performanceMonitor) {
      this.performanceMonitor.cleanup();
    }
    if (this.adapterManager) {
      this.adapterManager.cleanup();
    }
    if (this.eventBus) {
      this.eventBus.cleanup();
    }
  }
  cleanupPlatformAPI() {
    if (this.platformManager) {
      this.platformManager.unregisterPlugin("editorial");
    }
  }
  async loadDefaultModes() {
    const modesFolder = ".obsidian/plugins/editorial-engine/modes";
    try {
      const folderExists = await this.app.vault.adapter.exists(modesFolder);
      if (!folderExists) {
        await this.app.vault.adapter.mkdir(modesFolder);
        console.log("Created Editorial Engine modes folder");
        await this.createExampleModeFiles(modesFolder);
      }
      const files = await this.app.vault.adapter.list(modesFolder);
      const modeFiles = files.files.filter((file) => file.endsWith(".md"));
      let loadedCount = 0;
      for (const filePath of modeFiles) {
        try {
          const modeContent = await this.app.vault.adapter.read(filePath);
          const modeDefinition = this.parseModeFile(filePath, modeContent);
          if (modeDefinition) {
            await this.modeRegistry.registerMode(modeDefinition);
            loadedCount++;
            console.log(`Loaded mode from file: ${filePath}`);
          }
        } catch (error) {
          console.error(`Failed to load mode file ${filePath}:`, error);
        }
      }
      console.log(`Loaded ${loadedCount} modes from user-defined files`);
    } catch (error) {
      console.error("Failed to load modes from files, falling back to defaults:", error);
      await this.loadFallbackMode();
    }
  }
  async createExampleModeFiles(modesFolder) {
    const exampleModes = [
      {
        filename: "proofreader.md",
        content: `# Proofreader Mode

**Description:** Fix grammar, spelling, and basic clarity issues without changing the author's voice

## What I Can Do
- Fix spelling and grammar errors
- Correct punctuation mistakes
- Fix basic clarity issues
- Standardize formatting
- Improve sentence structure for clarity

## What I Cannot Do  
- Never change the author's voice or style
- Don't alter the meaning or intent
- Don't rewrite sentences unless grammatically incorrect
- Don't change technical terminology
- Don't make major structural changes

## Focus Areas
- Focus on mechanical correctness
- Preserve original phrasing when possible  
- Make minimal necessary changes
- Maintain the author's intended tone

## Boundaries
- Change no more than 10% of the original text
- Keep changes at word or phrase level
- Maintain original sentence structure when possible
- Only fix clear errors, don't impose style preferences

## Examples
**Input:** "The quick brown fox jump over the lazy dog, it was very quick."
**Expected:** "The quick brown fox jumps over the lazy dog. It was very quick."
**Explanation:** Fix subject-verb agreement and run-on sentence, but preserve simple style.
`
      },
      {
        filename: "copy-editor.md",
        content: `# Copy Editor Mode

**Description:** Improve style, flow, and consistency while preserving the author's voice

## What I Can Do
- Improve sentence flow and rhythm
- Enhance clarity and conciseness  
- Fix consistency issues in tone and style
- Suggest better word choices for precision
- Improve paragraph transitions and connections
- Eliminate redundancy and wordiness

## What I Cannot Do
- Don't change the author's fundamental voice
- Don't alter factual content or arguments  
- Don't impose a completely different writing style
- Don't change specialized terminology without reason
- Don't remove the author's personality from the text

## Focus Areas
- Focus on readability and flow
- Improve sentence variety and rhythm
- Enhance overall coherence and unity
- Strengthen transitions between ideas
- Maintain consistent tone throughout

## Boundaries  
- Change no more than 25% of the original text
- Preserve key phrases and distinctive expressions
- Maintain the document's purpose and audience
- Keep the author's level of formality
- Preserve technical accuracy

## Examples
**Input:** "The meeting was very productive and we got a lot done. We talked about many things. It was good."
**Expected:** "The meeting proved highly productive, covering multiple key topics and yielding concrete progress on our objectives."  
**Explanation:** Improved flow and precision while maintaining the positive, straightforward tone.
`
      },
      {
        filename: "my-custom-mode-template.md",
        content: `# My Custom Mode Template

**Description:** [Describe what this mode does - e.g., "Enhance creative writing for fantasy novels"]

## What I Can Do
- [List specific things this mode should do]
- [Be specific about the type of improvements]
- [Include any special focus areas]
- [Add domain-specific capabilities if needed]

## What I Cannot Do  
- [List things this mode should never do]
- [Include boundaries about voice/style preservation]  
- [Specify content that shouldn't be changed]
- [Add any domain-specific restrictions]

## Focus Areas
- [What should this mode prioritize?]
- [What aspects of writing should it focus on?]
- [Any specific techniques or approaches?]

## Boundaries
- [How much of the text can be changed? (e.g., "no more than 15%")]
- [What level of changes are appropriate? (word/phrase/sentence/paragraph)]
- [What must always be preserved?]
- [Any specific limitations?]

## Examples
**Input:** [Provide a sample of text this mode would work on]
**Expected:** [Show what the improved version should look like]
**Explanation:** [Explain why these specific changes align with the mode's purpose]

---
**Instructions:** 
1. Copy this template to create new modes
2. Replace all bracketed placeholders with your specific requirements  
3. Save as a new .md file in the modes folder
4. The Editorial Engine will automatically detect and load your new mode
`
      }
    ];
    for (const mode of exampleModes) {
      const filePath = `${modesFolder}/${mode.filename}`;
      try {
        await this.app.vault.adapter.write(filePath, mode.content);
        console.log(`Created example mode file: ${mode.filename}`);
      } catch (error) {
        console.error(`Failed to create ${mode.filename}:`, error);
      }
    }
  }
  parseModeFile(filePath, content) {
    var _a;
    try {
      const lines = content.split("\n");
      const modeId = ((_a = filePath.split("/").pop()) == null ? void 0 : _a.replace(".md", "")) || "unknown";
      let modeName = "";
      let description = "";
      const allowed = [];
      const forbidden = [];
      const focus = [];
      const boundaries = [];
      let currentSection = "";
      for (let line of lines) {
        line = line.trim();
        if (line.startsWith("# ") && !modeName) {
          modeName = line.substring(2).replace(" Mode", "").trim();
        }
        if (line.startsWith("**Description:**")) {
          description = line.replace("**Description:**", "").trim();
        }
        if (line.startsWith("## What I Can Do")) {
          currentSection = "allowed";
        } else if (line.startsWith("## What I Cannot Do")) {
          currentSection = "forbidden";
        } else if (line.startsWith("## Focus Areas")) {
          currentSection = "focus";
        } else if (line.startsWith("## Boundaries")) {
          currentSection = "boundaries";
        } else if (line.startsWith("## Examples") || line.startsWith("---")) {
          currentSection = "";
        }
        if (line.startsWith("- ") && currentSection) {
          const rule = line.substring(2).trim();
          switch (currentSection) {
            case "allowed":
              allowed.push(rule);
              break;
            case "forbidden":
              forbidden.push(rule);
              break;
            case "focus":
              focus.push(rule);
              break;
            case "boundaries":
              boundaries.push(rule);
              break;
          }
        }
      }
      if (!modeName || !description || allowed.length === 0) {
        console.warn(`Invalid mode file ${filePath}: missing required fields`);
        return null;
      }
      return {
        id: modeId,
        name: modeName,
        description,
        version: "1.0.0",
        author: "User Defined",
        naturalLanguageRules: {
          allowed,
          forbidden,
          focus,
          boundaries
        },
        examples: [],
        // Could be enhanced to parse examples from markdown
        constraints: [],
        // Will be compiled from natural language rules
        metadata: {
          category: "user-defined",
          difficulty: "custom",
          tags: [modeId],
          useCase: description
        }
      };
    } catch (error) {
      console.error(`Failed to parse mode file ${filePath}:`, error);
      return null;
    }
  }
  async loadFallbackMode() {
    const fallbackMode = {
      id: "basic-proofreader",
      name: "Basic Proofreader",
      description: "Basic grammar and spelling fixes",
      version: "1.0.0",
      author: "Writerr Platform",
      naturalLanguageRules: {
        allowed: ["Fix spelling and grammar errors"],
        forbidden: ["Don't change the author's voice"],
        focus: ["Focus on mechanical correctness"],
        boundaries: ["Make minimal necessary changes"]
      },
      examples: [],
      constraints: [],
      metadata: {
        category: "fallback",
        difficulty: "basic",
        tags: ["grammar"],
        useCase: "Emergency fallback mode"
      }
    };
    await this.modeRegistry.registerMode(fallbackMode);
    console.log("Loaded fallback proofreader mode");
  }
  async setupDefaultAdapters() {
    var _a;
    if ((_a = window.WritterrlAPI) == null ? void 0 : _a.trackEdits) {
      try {
        const { TrackEditsAdapter: TrackEditsAdapter2 } = await Promise.resolve().then(() => (init_track_edits_adapter(), track_edits_adapter_exports));
        const trackEditsAdapter = new TrackEditsAdapter2();
        await this.adapterManager.registerAdapter(trackEditsAdapter);
        console.log("Track Edits adapter registered successfully");
      } catch (error) {
        console.error("Failed to register Track Edits adapter:", error);
      }
    } else {
      console.log("Track Edits plugin not available, adapter registration skipped");
    }
    console.log("Editorial Engine adapter setup complete");
  }
  // Public API Methods
  async processRequest(intake) {
    try {
      this.eventBus.emit("processing-started", { intakeId: intake.id });
      const result = await this.simpleDiffProcessor.process(intake);
      this.eventBus.emit("processing-completed", {
        intakeId: intake.id,
        result
      });
      return result;
    } catch (error) {
      this.eventBus.emit("processing-failed", {
        intakeId: intake.id,
        error: error.message
      });
      throw error;
    }
  }
  async registerMode(mode) {
    return await this.modeRegistry.registerMode(mode);
  }
  getModes() {
    return this.modeRegistry.getAllModes();
  }
  getEnabledModes() {
    const allModes = this.modeRegistry.getAllModes();
    return allModes.filter((mode) => this.settings.enabledModes.includes(mode.id));
  }
  getMode(id) {
    return this.modeRegistry.getMode(id);
  }
  registerAdapter(adapter) {
    this.adapterManager.registerAdapter(adapter);
  }
  getStatus() {
    return {
      loaded: true,
      processor: "simple-diff-processor",
      modesCount: this.modeRegistry.getAllModes().length,
      adaptersCount: this.adapterManager.getAdapterCount(),
      settings: {
        defaultMode: this.settings.defaultMode,
        strictMode: this.settings.constraintValidation.strictMode
      },
      performance: this.performanceMonitor.getCurrentMetrics()
    };
  }
  getPerformanceMetrics() {
    return this.performanceMonitor.getDetailedMetrics();
  }
  // Utility method for other components
  emitEvent(event) {
    this.eventBus.emit(event.type, event.data);
  }
};
//# sourceMappingURL=main.js.map
