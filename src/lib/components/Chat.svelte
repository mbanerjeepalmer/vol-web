<script lang="ts">
	import { Crisp } from 'crisp-sdk-web';
	import { onMount } from 'svelte';

	Crisp.configure('dff8b97b-a019-4187-b065-c6ca5de05775');

	onMount(() => {
		console.log('Starting chat');
		Crisp.chat.open();
	});
</script>
