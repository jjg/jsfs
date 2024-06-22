# The JSFS Protocol

> I'm calling this "protocol" for now just because I don't want to waste any time thinking about a better term.  This document describes both how a JSFS server should interact with a client, but it also specifies some other aspects about how a "compliant" server should work which I'm not sure is accurately desrcibed as "protocol".

## Summary

JSFS is a federatable, deduplicating filesystem with a REST interface.

## Interface

A compliant JSFS server supports the following HTTP verbs:

* GET
* PUT [^1]
* POST
* HEAD
* DELETE
* EXECUTE [^2]

## Authorization

Keys and tokens are used to decide if a client has permission to execute a request against a given resource.

### Keys

A valid key will allow a client to make a request against the keys associated resource using any supported verb.  Keys set when a resource is created and can be changed if the client has the current key.

### Tokens



## Namespaces

## Deduplication

## Federation



[^1] PUT is an alias for POST, included for the conveniece of clients.
[^2] No JSFS server with EXECUTE support has been implemented so it may be considered optional for now.
