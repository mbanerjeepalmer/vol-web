<script lang="ts">
	let { offspring } = $props();
</script>

<div
	class="grid h-[760px] w-[1270px] grid-cols-2 grid-rows-1 bg-gradient-to-br from-green-500 to-fuchsia-500 drop-shadow"
>
	{#each offspring as child}
		{@render child.snip(child.args)}
	{/each}
</div>
