/*
 * Test that basic SDK usage (init, track, etc) does not
 * blow up in non-browser (node.js) envs. These are not
 * tests of server-side tracking functionality (which is
 * currently not supported in the browser lib).
 */

import { expect } from 'chai';
import mixpanel from '../../src/loaders/loader-module';

describe(`Module-based loader in Node env`, function() {
  it(`supports init() with options`, function(done) {
    mixpanel.init(`test-token`, {
      debug: true,
      persistence: `localStorage`,
      api_host: `https://test.com`,
      loaded: function() {
        done();
      },
    });
  });

  it(`supports init() with custom device_id`, function() {
    const instance = mixpanel.init(`test-token`, {
      device_id: `server-device-id`,
    }, `device-id-test-instance`);

    expect(instance.get_property(`$device_id`)).to.equal(`server-device-id`);
    expect(instance.get_distinct_id()).to.equal(`$device:server-device-id`);
  });

  it(`supports identify()`, function() {
    mixpanel.identify(`Pat`);
  });

  it(`supports track()`, function() {
    mixpanel.track(`Did stuff`);
  });
});
