// A jnode contains file metadata and a list of blocks representing file data

// TODO: Construct a proper class

function NewJnode() {
    return {
        id: 0,
        blocks: {}
    };
}

export { NewJnode };
