<script lang="ts">
	import '../app.css';
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
</header>

<!-- Status indicator -->

{@render children()}
