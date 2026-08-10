module.exports = {
    apps: [
        {
            name: 'QL-phong-lab',
            cwd: './',
            script: 'node_modules/next/dist/bin/next',
            args: 'start -p 3141',
            env: {
                NODE_ENV: 'production'
            }
        }
    ]
};