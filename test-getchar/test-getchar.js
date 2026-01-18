//@name test-getchar
//@display-name Test getCharacter
//@api 3.0
//@version 1.0.0

console.log('Test getCharacter plugin loaded');

Risuai.registerButton(
    {
        name: 'Test getCharacter',
        icon: '🧪',
        iconType: 'html',
        location: 'hamburger'
    },
    async () => {
        console.log('Button clicked, calling getCharacter()...');
        try {
            const char = await Risuai.getCharacter();
            console.log('getCharacter() success:', char);
            console.log('Character name:', char?.name);
        } catch (e) {
            console.error('getCharacter() failed:', e);
        }
    }
);

console.log('Test plugin ready - click the button to test getCharacter()');
