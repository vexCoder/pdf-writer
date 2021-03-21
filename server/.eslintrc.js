module.exports = {
    env: {
        browser: true,
        es2021: true,
    },
    extends: ['airbnb-base', 'prettier'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module',
    },
    plugins: ['@typescript-eslint', 'prettier'],
    rules: {
        'prettier/prettier': [
            'error',
            {
                'endOfLine': 'auto'
            },
        ],
        'class-methods-use-this': 'off',
        'no-param-reassign': 'off',
        camelcase: 'off',
        'no-unused-vars': 'off',
        'no-console': 'off',
        'no-use-before-define': 'off',
        'linebreak-style': ["error", "windows"],
        'import/extensions': 'off',
        'import/no-unresolved': 'off',
        "no-plusplus": 'off',
        "no-underscore-dangle": 'off',
        "consistent-return": 'off',
        "global-require": "off",
        "no-await-in-loop": "off",
        "no-loop-func": "off"
    },
    ignorePatterns: ["*.js"]
};