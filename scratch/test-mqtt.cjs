const mqtt = require('mqtt');

function test(protocol, port, path = '') {
  const url = `${protocol}://mqtt.hoanglong.dev:${port}${path}`;
  console.log('Testing', url);
  const client = mqtt.connect(url, { connectTimeout: 3000 });
  
  client.on('connect', () => {
    console.log('SUCCESS:', url);
    client.end();
  });
  
  client.on('error', (err) => {
    console.log('ERROR:', url, err.message);
    client.end();
  });

  client.on('offline', () => {
    console.log('OFFLINE:', url);
    client.end();
  });
}

test('mqtt', 1883);
test('ws', 8083, '/mqtt');
test('wss', 8084, '/mqtt');
test('wss', 443, '/mqtt');
