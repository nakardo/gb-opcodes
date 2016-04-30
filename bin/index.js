#! /usr/bin/env node
'use strict';

const fs = require('fs');
const request = require('request');
const cheerio = require('cheerio');


const parseContent = (elem) => {

    if (elem.length !== 3) return null;

    const op = { };

    const l1 = elem.get(0).data.split(' ');
    const l2 = elem.get(1).data.match(/^(\w+)\s*([0-9\/]+)$/) || [];

    op.mnemonic = l1[0];
    if (l1.length > 1) {
        op.operands = l1[1].split(',');
    }
    if (l2.length > 1) {
        op.bytes = parseInt(l2[1], 10);

        // Note:
        // For opcodes with conditional duration (e.g. CALL C,a16 3 12/24) will
        // use the first value.

        op.cycles = parseInt(l2[2], 10);
    }
    op.flagsZNHC = elem.get(2).data.split(' ');

    return op;
};

const parseTable = ($, table) => {

    const opcodes = { };

    $('tr:nth-of-type(n+2)', table)
        .map((i, elem) => $('td:nth-of-type(n+2)', elem).get())
        .map((i, elem) => $(elem).contents())
        .map((i, elem) => $(elem).filter((i, elem) => elem.type == 'text'))
        .map((i, elem) => opcodes[`0x${i.toString(16)}`] = parseContent(elem));

    return opcodes;
};

// References:
// - http://www.pastraiser.com/cpu/gameboy/gameboy_opcodes.html
// - https://github.com/NewbiZ/gbemu/tree/master/scripts

const URL = 'http://www.pastraiser.com/cpu/gameboy/gameboy_opcodes.html';

request(URL, function (err, response, body) {

    if (err) {
        console.error(err.message);
        process.exit(1);
    }

    const $ = cheerio.load(body);
    const tables = $('table').splice(0, 2);

    const data = [
        'unprefixed',
        'cbprefixed'
    ]
    .reduce((p, c, i) => {
        p[c] = parseTable($, tables[i]);
        return p;
    }, {});

    process.stdout.write(JSON.stringify(data, null, 2));
});
