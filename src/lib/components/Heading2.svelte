<script lang="ts">
	let { children, class: className = '' } = $props();
</script>

<h2 class="my-8 text-center text-2xl font-extrabold opacity-90 {className}">
	{@render children()}
</h2>
