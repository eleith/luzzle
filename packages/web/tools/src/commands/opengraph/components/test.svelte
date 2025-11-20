<script lang="ts">
    export let title: string;
</script>

<h1>{title}</h1>

<style>
    @font-face {
        font-family: 'TestFont';
        src: url(TestFont.woff2);
    }
    h1 {
        font-family: 'TestFont';
    }
</style>
