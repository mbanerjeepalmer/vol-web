<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	let { children } = $props();
</script>

<header class="container mx-auto p-4">
	<div class="flex items-center justify-center">
		<a href="/">
			<h1
				class="inline-block bg-gradient-to-r from-fuchsia-500 to-green-500 bg-clip-text text-center text-3xl font-bold text-transparent"
			>
				vol
			</h1>
		</a>
	</div>
	<ul class="mx-auto mb-6 mt-4 flex w-full max-w-lg flex-row justify-end gap-4 text-sm">
		<li>
			<a href="/history" class="mx-auto block text-center underline opacity-70 hover:opacity-100"
				>my vols</a
			>
		</li>
		<li>
			<a href="/how-to" class="mx-auto block text-center underline opacity-70 hover:opacity-100"
				>how to vol</a
			>
		</li>
	</ul>
</header>

<!-- Status indicator -->

{@render children()}
