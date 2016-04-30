#! /usr/bin/env node
'use strict';

const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const stream = require('JSONStream').stringify();


const parseContent = (i, elem) => {

    if (elem.length !== 3) return null;

    const inst = { opcode: `0x${(i).toString(16)}` };

    const l1 = elem.get(0).data.split(' ');
    const l2 = elem.get(1).data.match(/^(\w+)\s*([0-9\/]+)$/) || [];

    inst.mnemonic = l1[0];
    if (l1.length > 1) {
        inst.operands = l1[1].split(',');
    }
    if (l2.length > 1) {
        inst.bytes = parseInt(l2[1], 10);

        // Note:
        // For opcodes with conditional duration (e.g. CALL C,a16 3 12/24) will
        // use the first value.

        inst.cycles = parseInt(l2[2], 10);
    }
    inst.flagsZNHC = elem.get(2).data.split(' ');

    return inst;
};

const parseTable = ($, table, index) => {

    $('tr:nth-of-type(n+2)', table)
        .map((i, elem) => $('td:nth-of-type(n+2)', elem).get())
        .map((i, elem) => $(elem).contents())
        .map((i, elem) => $(elem).filter((i, elem) => elem.type == 'text'))
        .map((i, elem) => parseContent(index ? i + 0xcb00 : i, elem))
        .each((i, elem) => stream.write(elem));
};

// References:
// - http://www.pastraiser.com/cpu/gameboy/gameboy_opcodes.html
// - https://github.com/NewbiZ/gbemu/tree/master/scripts

fetch('http://www.pastraiser.com/cpu/gameboy/gameboy_opcodes.html')
    .then((res) => res.text())
    .then((body) => {
        const $ = cheerio.load(body);
        $('table').splice(0, 2).forEach((v, i) => parseTable($, v, i));
    })
    .then(() => stream.end())
    .catch((err) => {
        console.error(err.message);
        process.exit(1);
    });

stream.pipe(process.stdout);
