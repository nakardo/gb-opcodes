#! /usr/bin/env node
'use strict';

const fs = require('fs');
const request = require('request');
const cheerio = require('cheerio');
const stream = require('JSONStream').stringify();

const URL = 'http://www.pastraiser.com/cpu/gameboy/gameboy_opcodes.html';


const parseContent = (i, elem) => {

    if (elem.length !== 3) return null;

    const l1 = elem.get(0).data.split(' ');
    const l2 = elem.get(1).data.match(/^(\w+)\s*([0-9\/]+)$/) || [];

    return {
        opcode: `0x${(i).toString(16)}`,
        mnemonic: l1[0],
        operands: l1.length > 1 ? l1[1].split(',') : [],
        bytes: parseInt(l2[1], 10),
        cycles: l2[2].split('/').reduce((p, c) => Math.max(p, c), 0),
        flagsZNHC: elem.get(2).data.split(' ')
    };
};

const parseTable = ($, table, index) => {

    $('tr:nth-of-type(n+2)', table)
        .map((i, elem) => $('td:nth-of-type(n+2)', elem).get())
        .map((i, elem) => {
            const textNodes = $(elem)
                .contents()
                .filter((i, elem) => elem.type == 'text');

            return parseContent(index ? i + 0xcb00 : i, textNodes);
        })
        .each((i, elem) => stream.write(elem));
};

request(URL, (err, response) => {

    if (err) throw err;

    const $ = cheerio.load(response.body);
    $('table').splice(0, 2).forEach((v, i) => parseTable($, v, i));
    stream.end();
});

stream.pipe(process.stdout);
