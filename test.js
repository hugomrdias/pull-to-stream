'use strict';

const test = require('ava');

const values = require('pull-stream/sources/values');
const error = require('pull-stream/sources/error');
const pull = require('pull-stream');
const toStream = require('.');

test.cb('source on data', (t) => {
    t.plan(5);

    const vStream = toStream.readable(values([1, 2, 3, 4]));

    vStream.on('data', d => t.pass(d));
    vStream.on('end', (d) => {
        t.pass(d);
        t.end();
    });
});

test.cb('source readable', (t) => {
    t.plan(4);

    const readable = toStream.readable(values([1, 2, 3, 4]));

    readable.on('readable', () => {
        let chunk;

        while ((chunk = readable.read()) !== null) {
            t.pass(chunk);
        }
        t.end();
    });
});

test.cb('source error from pull-stream', (t) => {
    t.plan(1);

    const vStream = toStream.readable(error(new Error('test error')));

    vStream.on('data', d => console.log('data', d));
    vStream.on('error', (d) => {
        t.true(d instanceof Error, d.message);
        t.end();
    });
});

test.cb('source stream abort', (t) => {
    t.plan(3);

    const vStream = toStream.readable(values([1, 2, 3, 4], b => t.is(b, null)));

    vStream.on('data', (d) => {
        console.log(d);
    });
    vStream.destroy(new Error('abort'));
    vStream.on('error', d => t.true(d instanceof Error));
    vStream.on('close', () => {
        t.pass('close');
        t.end();
    });
});

test.cb('source pause/resume', (t) => {
    t.plan(4);

    const readable = toStream.readable(values([1, 2, 3, 4]));

    readable.on('data', (chunk) => {
        t.pass(chunk);
        readable.pause();
        setTimeout(() => {
            readable.resume();
        }, 1000);
    });

    readable.on('end', () => t.end());
});

test.cb('sink basic', (t) => {
    t.plan(1);

    const writeable = toStream.writeable(
        pull(
            pull.concat((err, c) => {
                if (err) {
                    return;
                }
                t.is(c, '123');
                t.end();
            })
        )
    );

    writeable.write(Buffer.from('1'));
    writeable.write(Buffer.from('2'));
    writeable.end(Buffer.from('3'));
});

test.cb('sink basic error', (t) => {
    t.plan(2);

    const writeable = toStream.writeable(
        pull(
            pull.concat((err) => {
                if (err) {
                    t.true(err instanceof Error, err.message);
                }
            })
        )
    );

    writeable.write(Buffer.from('1'));
    writeable.destroy(new Error('destroy'));
    writeable.on('error', d => t.true(d instanceof Error, d.message));
    writeable.on('close', () => t.end());
});

test.cb('sink back pressure', (t) => {
    t.plan(5);

    const writeable = toStream.writeable(
        pull(
            pull.concat((err, c) => {
                if (err) {
                    return;
                }
                t.is(c, '12');
            })
        ),
        { writableHighWaterMark: 1 }
    );

    const first = writeable.write(Buffer.from('1'), () => t.pass('first done'));

    t.false(first, 'wait');

    writeable.once('drain', () => {
        t.pass('drain');
        writeable.end(Buffer.from('2'), () => {
            t.pass('second done');
            t.end();
        });
    });
});
