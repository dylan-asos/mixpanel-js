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
    const uuid = `2f4c8f60-4f8e-4b22-9f95-1ac6a7340ec4`;
    const instance = mixpanel.init(`test-token`, {
      device_id: uuid,
    }, `device-id-test-instance`);

    expect(instance.get_property(`$device_id`)).to.equal(uuid);
    expect(instance.get_distinct_id()).to.equal(`$device:${uuid}`);
  });

  it(`ignores invalid init() device_id values`, function() {
    const instance = mixpanel.init(`test-token`, {
      device_id: `server-device-id`,
    }, `invalid-device-id-test-instance`);
    const generatedDeviceId = instance.get_property(`$device_id`);

    expect(generatedDeviceId).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(instance.get_distinct_id()).to.equal(`$device:${generatedDeviceId}`);
  });

  it(`supports identify()`, function() {
    mixpanel.identify(`Pat`);
  });

  it(`supports track()`, function() {
    mixpanel.track(`Did stuff`);
  });
});
